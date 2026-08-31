import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CancellationReason, Ride, RideStatus } from '@ridemesh/event-schema';
import { CreateTripDto } from './dto/create-trip.dto';
import { assertValidRideTransition, InvalidRideTransitionError } from './ride-state-machine';
import { TripsRepository } from './trips.repository';

@Injectable()
export class TripsService {
  constructor(private readonly repository: TripsRepository) {}

  /**
   * Phase 2/3 bridge: Dispatch Service (Phase 7) doesn't exist yet to consume
   * `ride.requested` and asynchronously advance REQUESTED -> MATCHING, so we
   * apply that same guarded transition synchronously here.
   */
  async create(dto: CreateTripDto): Promise<Ride> {
    const ride = await this.repository.create(dto);
    return this.transitionTo(ride.id, RideStatus.MATCHING);
  }

  async findById(id: string): Promise<Ride> {
    const ride = await this.repository.findById(id);
    if (!ride) {
      throw new NotFoundException(`Ride ${id} not found`);
    }
    return ride;
  }

  async markDriverArrived(id: string): Promise<Ride> {
    return this.transitionTo(id, RideStatus.DRIVER_ARRIVED);
  }

  async start(id: string): Promise<Ride> {
    return this.transitionTo(id, RideStatus.IN_PROGRESS);
  }

  async complete(id: string): Promise<Ride> {
    return this.transitionTo(id, RideStatus.COMPLETED);
  }

  async cancel(id: string, reason: CancellationReason = CancellationReason.RIDER_CANCELLED): Promise<Ride> {
    const ride = await this.findById(id);
    this.guardTransition(ride.status, RideStatus.CANCELLED);
    return this.repository.transition(id, RideStatus.CANCELLED, { cancellationReason: reason });
  }

  private async transitionTo(id: string, to: RideStatus): Promise<Ride> {
    const ride = await this.findById(id);
    this.guardTransition(ride.status, to);
    return this.repository.transition(id, to);
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
