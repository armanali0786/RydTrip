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

interface DriverAcceptedPayload {
  rideId: string;
  driverId: string;
}

interface DriverRejectedPayload {
  rideId: string;
}

function isRideRequestedPayload(payload: unknown): payload is RideRequestedPayload {
  const p = payload as Partial<RideRequestedPayload> | null;
  return !!p && typeof p.rideId === 'string' && typeof p.riderId === 'string' && !!p.pickup && !!p.destination;
}

function isRideCancelledPayload(payload: unknown): payload is RideCancelledPayload {
  const p = payload as Partial<RideCancelledPayload> | null;
  return !!p && typeof p.rideId === 'string';
}

function isDriverAcceptedPayload(payload: unknown): payload is DriverAcceptedPayload {
  const p = payload as Partial<DriverAcceptedPayload> | null;
  return !!p && typeof p.rideId === 'string' && typeof p.driverId === 'string';
}

function isDriverRejectedPayload(payload: unknown): payload is DriverRejectedPayload {
  const p = payload as Partial<DriverRejectedPayload> | null;
  return !!p && typeof p.rideId === 'string';
}

/**
 * Consumer group "trip-service" — its committed offset is what makes the
 * Phase 5 exit criterion true: kill this process, restart it, and it
 * resumes from the last committed offset rather than replaying everything
 * or losing anything in between.
 *
 * Idempotency (duplicate delivery of the same eventId) is guarded in
 * TripsService/TripsRepository via the `processed_events` table (Phase 8).
 * A handler error here is rethrown, not swallowed, so EventConsumer's
 * retry-with-backoff + Dead Letter Topic wrapper (also Phase 8) can do its
 * job — retrying transient failures a few times before parking a genuinely
 * poison message on `trip-service.dlt` rather than looping forever or
 * silently dropping it.
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
    await this.consumer.subscribe([
      KAFKA_TOPICS.RIDE_REQUESTED,
      KAFKA_TOPICS.RIDE_CANCELLED,
      KAFKA_TOPICS.DRIVER_ACCEPTED,
      KAFKA_TOPICS.DRIVER_REJECTED,
    ]);

    await this.consumer.run(async (envelope) => {
      this.logger.log(
        `consumed ${envelope.eventType} eventId=${envelope.eventId} correlationId=${envelope.correlationId}`,
      );

      if (envelope.eventType === KAFKA_TOPICS.RIDE_REQUESTED) {
        if (!isRideRequestedPayload(envelope.payload)) {
          throw new Error(`malformed ${KAFKA_TOPICS.RIDE_REQUESTED} payload for eventId=${envelope.eventId}`);
        }
        await this.tripsService.handleRideRequested(
          {
            id: envelope.payload.rideId,
            riderId: envelope.payload.riderId,
            pickup: envelope.payload.pickup,
            destination: envelope.payload.destination,
          },
          envelope.eventId,
        );
      } else if (envelope.eventType === KAFKA_TOPICS.RIDE_CANCELLED) {
        if (!isRideCancelledPayload(envelope.payload)) {
          throw new Error(`malformed ${KAFKA_TOPICS.RIDE_CANCELLED} payload for eventId=${envelope.eventId}`);
        }
        await this.tripsService.handleRideCancelled(envelope.payload.rideId, envelope.payload.reason, envelope.eventId);
      } else if (envelope.eventType === KAFKA_TOPICS.DRIVER_ACCEPTED) {
        if (!isDriverAcceptedPayload(envelope.payload)) {
          throw new Error(`malformed ${KAFKA_TOPICS.DRIVER_ACCEPTED} payload for eventId=${envelope.eventId}`);
        }
        await this.tripsService.handleDriverAccepted(envelope.payload.rideId, envelope.payload.driverId, envelope.eventId);
      } else if (envelope.eventType === KAFKA_TOPICS.DRIVER_REJECTED) {
        if (!isDriverRejectedPayload(envelope.payload)) {
          throw new Error(`malformed ${KAFKA_TOPICS.DRIVER_REJECTED} payload for eventId=${envelope.eventId}`);
        }
        await this.tripsService.handleDriverRejected(envelope.payload.rideId, envelope.eventId);
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
  }
}
