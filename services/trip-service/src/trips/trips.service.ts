import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CancellationReason, Ride, RideStatus } from '@ridemesh/event-schema';
import { CreateTripDto } from './dto/create-trip.dto';
import { assertValidRideTransition, InvalidRideTransitionError } from './ride-state-machine';
import { TripsRepository } from './trips.repository';

@Injectable()
export class TripsService {
  constructor(private readonly repository: TripsRepository) {}

  /**
   * Phase 2 bridge: Dispatch Service (Phase 7) doesn't exist yet to consume
   * `ride.requested` and asynchronously advance REQUESTED -> MATCHING, so we
   * apply that same guarded transition synchronously here. This method's
   * shape (persist at REQUESTED, then transition) mirrors what the real
   * Kafka consumer will do in Phase 5+7.
   */
  create(dto: CreateTripDto): Ride {
    const now = new Date().toISOString();
    const ride: Ride = {
      id: randomUUID(),
      riderId: dto.riderId,
      pickup: dto.pickup,
      destination: dto.destination,
      status: RideStatus.REQUESTED,
      createdAt: now,
      updatedAt: now,
    };
    this.repository.save(ride);
    return this.transitionTo(ride.id, RideStatus.MATCHING);
  }

  findById(id: string): Ride {
    const ride = this.repository.findById(id);
    if (!ride) {
      throw new NotFoundException(`Ride ${id} not found`);
    }
    return ride;
  }

  markDriverArrived(id: string): Ride {
    return this.transitionTo(id, RideStatus.DRIVER_ARRIVED);
  }

  start(id: string): Ride {
    return this.transitionTo(id, RideStatus.IN_PROGRESS);
  }

  complete(id: string): Ride {
    return this.transitionTo(id, RideStatus.COMPLETED);
  }

  cancel(id: string, reason: CancellationReason = CancellationReason.RIDER_CANCELLED): Ride {
    const ride = this.findById(id);
    this.guardTransition(ride.status, RideStatus.CANCELLED);
    const updated: Ride = {
      ...ride,
      status: RideStatus.CANCELLED,
      cancellationReason: reason,
      updatedAt: new Date().toISOString(),
    };
    return this.repository.save(updated);
  }

  private transitionTo(id: string, to: RideStatus): Ride {
    const ride = this.findById(id);
    this.guardTransition(ride.status, to);
    const updated: Ride = { ...ride, status: to, updatedAt: new Date().toISOString() };
    return this.repository.save(updated);
  }

  private guardTransition(from: RideStatus, to: RideStatus): void {
    try {
      assertValidRideTransition(from, to);
    } catch (err) {
      if (err instanceof InvalidRideTransitionError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }
}
