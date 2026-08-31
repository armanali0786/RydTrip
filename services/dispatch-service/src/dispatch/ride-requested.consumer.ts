import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createKafkaClient, EventConsumer, GeoPoint, KAFKA_TOPICS } from '@rydtrip/event-schema';
import { DispatchService } from './dispatch.service';
import { RedisService } from '../redis/redis.service';

interface RideRequestedPayload {
  rideId: string;
  riderId: string;
  pickup: GeoPoint;
  destination: GeoPoint;
}

function isRideRequestedPayload(payload: unknown): payload is RideRequestedPayload {
  const p = payload as Partial<RideRequestedPayload> | null;
  return !!p && typeof p.rideId === 'string' && !!p.pickup;
}

/** Matches this consumer's Kafka group id below — the IdempotencyStore key. */
const CONSUMER_NAME = 'dispatch-service';

/**
 * Consumer group "dispatch-service", same offset-resumption guarantee as
 * Trip Service's consumer (Phase 5). ride.cancelled isn't consumed here —
 * cancelling a ride mid-dispatch is a real race but out of scope for this
 * phase's exit criteria (see dispatch.service.ts's Phase 8 note on
 * reservation compensation).
 *
 * Duplicate delivery of the same eventId is guarded via RedisService's
 * IdempotencyStore (Phase 8) — checked before, marked after, dispatching a
 * ride: unlike Trip Service's Postgres-backed processed_events table, there
 * is no shared transaction tying the check to handleRideRequested()'s
 * side effects (Dispatch has no Postgres of its own), so this is a
 * check-then-mark pair rather than one atomic write. That's sufficient here
 * because a single Kafka partition is only ever consumed by one process at a
 * time, so there's no concurrent duplicate processing to race against —
 * only sequential *redelivery*, which check-then-mark handles correctly.
 *
 * A handler error is rethrown (not swallowed) so EventConsumer's
 * retry-with-backoff + Dead Letter Topic wrapper (Phase 8) owns retrying and
 * eventually parking a genuinely poison event on `dispatch-service.dlt`.
 */
@Injectable()
export class RideRequestedConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RideRequestedConsumer.name);
  private readonly consumer: EventConsumer;

  constructor(
    private readonly dispatchService: DispatchService,
    private readonly redis: RedisService,
  ) {
    const kafka = createKafkaClient({
      clientId: 'dispatch-service',
      brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    });
    this.consumer = new EventConsumer(kafka, CONSUMER_NAME);
  }

  async onModuleInit(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe([KAFKA_TOPICS.RIDE_REQUESTED]);

    await this.consumer.run(async (envelope) => {
      this.logger.log(`consumed ${envelope.eventType} eventId=${envelope.eventId} correlationId=${envelope.correlationId}`);

      if (!isRideRequestedPayload(envelope.payload)) {
        throw new Error(`malformed ${KAFKA_TOPICS.RIDE_REQUESTED} payload for eventId=${envelope.eventId}`);
      }

      const alreadyProcessed = await this.redis.idempotency.wasProcessed(CONSUMER_NAME, envelope.eventId);
      if (alreadyProcessed) {
        this.logger.log(`skipping duplicate delivery of ${envelope.eventType} eventId=${envelope.eventId}`);
        return;
      }

      await this.dispatchService.handleRideRequested(
        envelope.payload.rideId,
        envelope.payload.pickup,
        envelope.correlationId,
      );
      await this.redis.idempotency.markProcessed(CONSUMER_NAME, envelope.eventId);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
  }
}
