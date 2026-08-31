import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { CancellationReason, KAFKA_TOPICS } from '@rydtrip/event-schema';
import { KafkaPublisherService } from '../kafka/kafka-publisher.service';
import { RidersService } from '../riders/riders.service';
import { CreateRideDto } from './dto/create-ride.dto';

export interface RideAck {
  rideId: string;
  status: 'REQUESTED' | 'CANCELLATION_REQUESTED';
}

@Injectable()
export class RidesService {
  private readonly logger = new Logger(RidesService.name);

  constructor(
    private readonly ridersService: RidersService,
    private readonly publisher: KafkaPublisherService,
  ) {}

  /**
   * Validates the rider exists, then publishes ride.requested and returns
   * immediately — matching ADR-003: matching duration is variable and must
   * not hold this HTTP request open. Trip Service's consumer (Phase 5) picks
   * this up asynchronously; there is a brief, expected window where the ride
   * is REQUESTED before Trip Service advances it to MATCHING.
   */
  async create(dto: CreateRideDto, correlationId: string): Promise<RideAck> {
    await this.ridersService.findById(dto.riderId); // throws NotFoundException if unknown

    const rideId = randomUUID();
    await this.publisher.publish(
      KAFKA_TOPICS.RIDE_REQUESTED,
      KAFKA_TOPICS.RIDE_REQUESTED,
      { rideId, riderId: dto.riderId, pickup: dto.pickup, destination: dto.destination },
      { correlationId, key: rideId },
    );

    this.logger.log(`Published ${KAFKA_TOPICS.RIDE_REQUESTED} rideId=${rideId} correlationId=${correlationId}`);

    return { rideId, status: 'REQUESTED' };
  }

  /**
   * Fire-and-forget by design: Rider Service doesn't hold ride state (that's
   * Trip Service's job per ADR-004), so it can't synchronously validate
   * whether this ride is currently cancellable. Trip Service's consumer
   * applies the real state-machine guard when it processes the event.
   */
  async cancel(
    rideId: string,
    correlationId: string,
    reason: CancellationReason = CancellationReason.RIDER_CANCELLED,
  ): Promise<RideAck> {
    await this.publisher.publish(
      KAFKA_TOPICS.RIDE_CANCELLED,
      KAFKA_TOPICS.RIDE_CANCELLED,
      { rideId, reason },
      { correlationId, key: rideId },
    );

    this.logger.log(`Published ${KAFKA_TOPICS.RIDE_CANCELLED} rideId=${rideId} correlationId=${correlationId}`);

    return { rideId, status: 'CANCELLATION_REQUESTED' };
  }
}
