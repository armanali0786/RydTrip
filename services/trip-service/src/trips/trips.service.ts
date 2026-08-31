import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CancellationReason, Ride, RideStatus } from '@rydtrip/event-schema';
import { assertValidRideTransition, InvalidRideTransitionError } from './ride-state-machine';
import { CreateRideInput, TripsRepository } from './trips.repository';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(private readonly repository: TripsRepository) {}

  /**
   * Consumes ride.requested (Phase 5, replacing the retired Phase 2/3 HTTP
   * bridge). Dispatch Service (Phase 7) doesn't exist yet to do real
   * matching, so we advance REQUESTED -> MATCHING immediately — the guarded
   * transition Phase 7 will eventually drive from dispatch outcomes instead.
   */
  async handleRideRequested(input: CreateRideInput): Promise<void> {
    const ride = await this.repository.create(input);
    await this.transitionTo(ride.id, RideStatus.MATCHING);
    this.logger.log(`ride ${ride.id} created and advanced to MATCHING`);
  }

  /** Consumes ride.cancelled (Phase 5). See cancel() for the guard applied. */
  async handleRideCancelled(rideId: string, reason?: CancellationReason): Promise<void> {
    await this.cancel(rideId, reason);
    this.logger.log(`ride ${rideId} cancelled via event`);
  }

  /**
   * Consumes driver.accepted (Phase 7). MATCHED -> DRIVER_ARRIVING isn't
   * independently triggerable (see ride-state-machine.ts) — both hops happen
   * together as soon as Dispatch confirms a driver, which is what this event
   * represents (there's no separate human accept/reject step yet).
   */
  async handleDriverAccepted(rideId: string, driverId: string): Promise<void> {
    const ride = await this.findById(rideId);
    this.guardTransition(ride.status, RideStatus.MATCHED);
    await this.repository.transition(rideId, RideStatus.MATCHED, { driverId });
    await this.transitionTo(rideId, RideStatus.DRIVER_ARRIVING);
    this.logger.log(`ride ${rideId} matched with driver ${driverId}, advancing to DRIVER_ARRIVING`);
  }

  /** Consumes driver.rejected (Phase 7): Dispatch exhausted every candidate. */
  async handleDriverRejected(rideId: string): Promise<void> {
    await this.cancel(rideId, CancellationReason.NO_DRIVERS_AVAILABLE);
    this.logger.log(`ride ${rideId} cancelled: no drivers available`);
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
