import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createKafkaClient, EventConsumer, GeoPoint, KAFKA_TOPICS } from '@rydtrip/event-schema';
import { DispatchService } from './dispatch.service';

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

/**
 * Consumer group "dispatch-service", same offset-resumption guarantee as
 * Trip Service's consumer (Phase 5). ride.cancelled isn't consumed here —
 * cancelling a ride mid-dispatch is a real race but out of scope for this
 * phase's exit criteria (see dispatch.service.ts's Phase 8 note on
 * reservation compensation).
 */
@Injectable()
export class RideRequestedConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RideRequestedConsumer.name);
  private readonly consumer: EventConsumer;

  constructor(private readonly dispatchService: DispatchService) {
    const kafka = createKafkaClient({
      clientId: 'dispatch-service',
      brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    });
    this.consumer = new EventConsumer(kafka, 'dispatch-service');
  }

  async onModuleInit(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe([KAFKA_TOPICS.RIDE_REQUESTED]);

    await this.consumer.run(async (envelope) => {
      this.logger.log(`consumed ${envelope.eventType} eventId=${envelope.eventId} correlationId=${envelope.correlationId}`);

      if (!isRideRequestedPayload(envelope.payload)) {
        this.logger.error(`malformed ${KAFKA_TOPICS.RIDE_REQUESTED} payload, skipping eventId=${envelope.eventId}`);
        return;
      }

      try {
        await this.dispatchService.handleRideRequested(
          envelope.payload.rideId,
          envelope.payload.pickup,
          envelope.correlationId,
        );
      } catch (err) {
        this.logger.error(
          `failed to dispatch ride ${envelope.payload.rideId} correlationId=${envelope.correlationId}: ${(err as Error).message}`,
        );
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
  }
}
