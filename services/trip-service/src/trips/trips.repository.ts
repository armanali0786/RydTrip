import { Injectable } from '@nestjs/common';
import { Ride } from '@ridemesh/event-schema';

/**
 * In-memory store for Phase 2. Replaced by a Prisma-backed repository with
 * the same interface in Phase 3.
 */
@Injectable()
export class TripsRepository {
  private readonly ridesById = new Map<string, Ride>();

  save(ride: Ride): Ride {
    this.ridesById.set(ride.id, ride);
    return ride;
  }

  findById(id: string): Ride | undefined {
    return this.ridesById.get(id);
  }
}
