import { Injectable } from '@nestjs/common';
import { Rider } from '@ridemesh/event-schema';

/**
 * In-memory store for Phase 2. Replaced by a Prisma-backed repository with
 * the same interface in Phase 3.
 */
@Injectable()
export class RidersRepository {
  private readonly ridersById = new Map<string, Rider>();

  save(rider: Rider): Rider {
    this.ridersById.set(rider.id, rider);
    return rider;
  }

  findById(id: string): Rider | undefined {
    return this.ridersById.get(id);
  }
}
