import { Injectable, Logger } from '@nestjs/common';
import { CancellationReason, DriverStatus, GeoPoint, KAFKA_TOPICS } from '@rydtrip/event-schema';
import { KafkaPublisherService } from '../kafka/kafka-publisher.service';
import { RedisService } from '../redis/redis.service';

const DEFAULTS = {
  searchRadiusKm: 5,
  candidateLimit: 5,
  reservationTtlSeconds: 30,
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
 * doesn't unwind the reservation; that kind of cross-system compensation is
 * Phase 8 (Reliability) territory, not this phase's stated goal.
 */
@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);
  private readonly searchRadiusKm = Number(process.env.DISPATCH_SEARCH_RADIUS_KM) || DEFAULTS.searchRadiusKm;
  private readonly candidateLimit = Number(process.env.DISPATCH_CANDIDATE_LIMIT) || DEFAULTS.candidateLimit;
  private readonly reservationTtlSeconds =
    Number(process.env.RESERVATION_TTL_SECONDS) || DEFAULTS.reservationTtlSeconds;
  private readonly driverServiceUrl = process.env.DRIVER_SERVICE_URL ?? 'http://localhost:3002';

  constructor(
    private readonly redis: RedisService,
    private readonly kafkaPublisher: KafkaPublisherService,
  ) {}

  async handleRideRequested(rideId: string, pickup: GeoPoint, correlationId: string): Promise<void> {
    const candidates = await this.redis.geoIndex.findNearby(
      pickup.lat,
      pickup.lng,
      this.searchRadiusKm,
      this.candidateLimit,
    );

    for (const candidate of candidates) {
      const won = await this.redis.reservations.tryReserve(candidate.driverId, rideId, this.reservationTtlSeconds);
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
      // No human-in-the-loop accept/reject exists yet (that's the frontend's
      // own simulated flow, not a real backend endpoint) — a won reservation
      // is treated as accepted immediately.
      await this.kafkaPublisher.publish(
        KAFKA_TOPICS.DRIVER_ACCEPTED,
        KAFKA_TOPICS.DRIVER_ACCEPTED,
        { rideId, driverId: candidate.driverId },
        { correlationId, key: rideId },
      );
      this.logger.log(`ride ${rideId} matched with driver ${candidate.driverId}`);
      return;
    }

    await this.kafkaPublisher.publish(
      KAFKA_TOPICS.DRIVER_REJECTED,
      KAFKA_TOPICS.DRIVER_REJECTED,
      { rideId, reason: CancellationReason.NO_DRIVERS_AVAILABLE },
      { correlationId, key: rideId },
    );
    this.logger.log(`ride ${rideId} rejected — no reservable driver among ${candidates.length} candidate(s)`);
  }

  private async syncDriverStatusBestEffort(driverId: string): Promise<void> {
    try {
      const res = await fetch(`${this.driverServiceUrl}/drivers/${driverId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: DriverStatus.RESERVED }),
      });
      if (!res.ok) {
        this.logger.warn(`driver-service rejected status sync for ${driverId}: HTTP ${res.status}`);
      }
    } catch (err) {
      this.logger.warn(`driver-service unreachable syncing status for ${driverId}: ${(err as Error).message}`);
    }
  }
}
