import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CancellationReason, createKafkaClient, EventConsumer, GeoPoint, KAFKA_TOPICS } from '@rydtrip/event-schema';
import { TripsService } from './trips.service';

interface RideRequestedPayload {
  rideId: string;
  riderId: string;
  pickup: GeoPoint;
  destination: GeoPoint;
}

interface RideCancelledPayload {
  rideId: string;
  reason?: CancellationReason;
}

function isRideRequestedPayload(payload: unknown): payload is RideRequestedPayload {
  const p = payload as Partial<RideRequestedPayload> | null;
  return !!p && typeof p.rideId === 'string' && typeof p.riderId === 'string' && !!p.pickup && !!p.destination;
}

function isRideCancelledPayload(payload: unknown): payload is RideCancelledPayload {
  const p = payload as Partial<RideCancelledPayload> | null;
  return !!p && typeof p.rideId === 'string';
}

/**
 * Consumer group "trip-service" — its committed offset is what makes the
 * Phase 5 exit criterion true: kill this process, restart it, and it
 * resumes from the last committed offset rather than replaying everything
 * or losing anything in between.
 *
 * No idempotency guard and no Dead Letter Topic here yet — both are Phase 8.
 * A handler error is caught and logged so one bad message doesn't take down
 * the consumer loop, but it is not retried or parked anywhere yet.
 */
@Injectable()
export class RideEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RideEventsConsumer.name);
  private readonly consumer: EventConsumer;

  constructor(private readonly tripsService: TripsService) {
    const kafka = createKafkaClient({
      clientId: 'trip-service',
      brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    });
    this.consumer = new EventConsumer(kafka, 'trip-service');
  }

  async onModuleInit(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe([KAFKA_TOPICS.RIDE_REQUESTED, KAFKA_TOPICS.RIDE_CANCELLED]);

    await this.consumer.run(async (envelope) => {
      this.logger.log(
        `consumed ${envelope.eventType} eventId=${envelope.eventId} correlationId=${envelope.correlationId}`,
      );

      try {
        if (envelope.eventType === KAFKA_TOPICS.RIDE_REQUESTED) {
          if (!isRideRequestedPayload(envelope.payload)) {
            this.logger.error(`malformed ${KAFKA_TOPICS.RIDE_REQUESTED} payload, skipping eventId=${envelope.eventId}`);
            return;
          }
          await this.tripsService.handleRideRequested({
            id: envelope.payload.rideId,
            riderId: envelope.payload.riderId,
            pickup: envelope.payload.pickup,
            destination: envelope.payload.destination,
          });
        } else if (envelope.eventType === KAFKA_TOPICS.RIDE_CANCELLED) {
          if (!isRideCancelledPayload(envelope.payload)) {
            this.logger.error(`malformed ${KAFKA_TOPICS.RIDE_CANCELLED} payload, skipping eventId=${envelope.eventId}`);
            return;
          }
          await this.tripsService.handleRideCancelled(envelope.payload.rideId, envelope.payload.reason);
        }
      } catch (err) {
        this.logger.error(
          `failed to handle ${envelope.eventType} correlationId=${envelope.correlationId}: ${(err as Error).message}`,
        );
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
  }
}
