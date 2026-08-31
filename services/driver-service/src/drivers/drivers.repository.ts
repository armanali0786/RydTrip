import { Injectable } from '@nestjs/common';
import { Driver } from '@ridemesh/event-schema';

/**
 * In-memory store for Phase 2. Replaced by a Prisma-backed repository with
 * the same interface in Phase 3 — callers should not need to change.
 */
@Injectable()
export class DriversRepository {
  private readonly driversById = new Map<string, Driver>();

  save(driver: Driver): Driver {
    this.driversById.set(driver.id, driver);
    return driver;
  }

  findById(id: string): Driver | undefined {
    return this.driversById.get(id);
  }
}
