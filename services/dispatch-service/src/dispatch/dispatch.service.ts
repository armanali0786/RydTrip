import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreaker } from '@rydtrip/circuit-breaker';
import { CancellationReason, DriverStatus, GeoPoint, KAFKA_TOPICS } from '@rydtrip/event-schema';
import { getRidesProcessedCounter, registerCircuitStateGauge } from './dispatch-metrics';
import { KafkaPublisherService } from '../kafka/kafka-publisher.service';
import { RedisService } from '../redis/redis.service';

const DEFAULTS = {
  searchRadiusKm: 5,
  candidateLimit: 5,
  reservationTtlSeconds: 30,
  circuitFailureThreshold: 5,
  circuitResetTimeoutMs: 10_000,
};

/**
 * The core Phase 7 flow: rank nearby candidates by distance (Redis GEO,
 * already heartbeat-filtered by Location Service's staleness rule), then try
 * to atomically reserve them in ranked order until one succeeds or the list
 * is exhausted. tryReserve()'s atomicity (see driver-reservation-store.ts) is
 * what guarantees exactly one winner under concurrent ride.requested events
 * targeting the same driver — this is the race the Phase 7 exit criterion
 * tests directly.
 *
 * Driver Service's Postgres status is synced best-effort after winning the
 * Redis reservation, not as part of the same atomic operation — Redis is the
 * hot-path source of truth for "who won"; Postgres is the durable/audit
 * mirror (see data-model.md's note on the `status` index). A failed sync
 * doesn't unwind the reservation — this is an intentional, permanent
 * best-effort design choice (real cross-system compensation/sagas are out of
 * scope for this project), not a placeholder for something more.
 *
 * Phase 8 wraps both of dispatch's external dependencies in their own
 * CircuitBreaker: `redisBreaker` around the GEO lookup + reservation calls,
 * `driverServiceBreaker` around the best-effort HTTP sync. If Redis is
 * genuinely down, redisBreaker fails fast (CircuitOpenError) instead of
 * letting every ride.requested event individually hang on ioredis's own
 * connection retries — that thrown error is exactly what
 * RideRequestedConsumer needs to trigger EventConsumer's retry-with-backoff
 * (a real Redis outage is the transient-failure case that deliverable
 * exists for). driverServiceBreaker just shortens an already best-effort,
 * already-caught failure — it never changes what handleRideRequested
 * returns.
 */
@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);
  private readonly searchRadiusKm = Number(process.env.DISPATCH_SEARCH_RADIUS_KM) || DEFAULTS.searchRadiusKm;
  private readonly candidateLimit = Number(process.env.DISPATCH_CANDIDATE_LIMIT) || DEFAULTS.candidateLimit;
  private readonly reservationTtlSeconds =
    Number(process.env.RESERVATION_TTL_SECONDS) || DEFAULTS.reservationTtlSeconds;
  private readonly driverServiceUrl = process.env.DRIVER_SERVICE_URL ?? 'http://localhost:3002';
  private readonly redisBreaker = new CircuitBreaker('dispatch-redis', {
    failureThreshold: Number(process.env.DISPATCH_CIRCUIT_FAILURE_THRESHOLD) || DEFAULTS.circuitFailureThreshold,
    resetTimeoutMs: Number(process.env.DISPATCH_CIRCUIT_RESET_TIMEOUT_MS) || DEFAULTS.circuitResetTimeoutMs,
  });
  private readonly driverServiceBreaker = new CircuitBreaker('dispatch-driver-service-sync', {
    failureThreshold: Number(process.env.DISPATCH_CIRCUIT_FAILURE_THRESHOLD) || DEFAULTS.circuitFailureThreshold,
    resetTimeoutMs: Number(process.env.DISPATCH_CIRCUIT_RESET_TIMEOUT_MS) || DEFAULTS.circuitResetTimeoutMs,
  });

  private readonly ridesProcessed = getRidesProcessedCounter();

  constructor(
    private readonly redis: RedisService,
    private readonly kafkaPublisher: KafkaPublisherService,
  ) {
    registerCircuitStateGauge('dispatch-redis', () => this.redisBreaker.getState());
    registerCircuitStateGauge('dispatch-driver-service-sync', () => this.driverServiceBreaker.getState());
  }

  async handleRideRequested(rideId: string, pickup: GeoPoint, correlationId: string): Promise<void> {
    const candidates = await this.redisBreaker.execute(() =>
      this.redis.geoIndex.findNearby(pickup.lat, pickup.lng, this.searchRadiusKm, this.candidateLimit),
    );

    for (const candidate of candidates) {
      const won = await this.redisBreaker.execute(() =>
        this.redis.reservations.tryReserve(candidate.driverId, rideId, this.reservationTtlSeconds),
      );
      if (!won) {
        this.logger.log(`lost reservation race for driver ${candidate.driverId}, ride ${rideId} — trying next candidate`);
        continue;
      }

      await this.syncDriverStatusBestEffort(candidate.driverId);

      await this.kafkaPublisher.publish(
        KAFKA_TOPICS.DRIVER_RESERVED,
        KAFKA_TOPICS.DRIVER_RESERVED,
        { rideId, driverId: candidate.driverId },
        { correlationId, key: rideId },
      );
      // The human-in-the-loop accept/decline step lives in Trip Service now
      // (POST /trips/:id/accept|decline, driver-triggered) — a won
      // reservation just means "matched, awaiting the driver's decision",
      // not "accepted". This function's job ends at matching.
      this.logger.log(`ride ${rideId} matched with driver ${candidate.driverId}, awaiting driver accept`);
      this.ridesProcessed.inc({ outcome: 'matched' });
      return;
    }

    await this.kafkaPublisher.publish(
      KAFKA_TOPICS.DRIVER_REJECTED,
      KAFKA_TOPICS.DRIVER_REJECTED,
      { rideId, reason: CancellationReason.NO_DRIVERS_AVAILABLE },
      { correlationId, key: rideId },
    );
    this.logger.log(`ride ${rideId} rejected — no reservable driver among ${candidates.length} candidate(s)`);
    this.ridesProcessed.inc({ outcome: 'no_driver_available' });
  }

  private async syncDriverStatusBestEffort(driverId: string): Promise<void> {
    try {
      await this.driverServiceBreaker.execute(async () => {
        const res = await fetch(`${this.driverServiceUrl}/drivers/${driverId}/status`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: DriverStatus.RESERVED }),
        });
        if (!res.ok) {
          throw new Error(`driver-service rejected status sync for ${driverId}: HTTP ${res.status}`);
        }
      });
    } catch (err) {
      this.logger.warn(`best-effort driver status sync skipped for ${driverId}: ${(err as Error).message}`);
    }
  }
}
