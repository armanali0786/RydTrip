import type Redis from 'ioredis';

function reservationKey(driverId: string): string {
  return `driver:${driverId}:reservation`;
}

/**
 * Dispatch Service's half of the Redis key space (Location Service owns
 * `drivers:geo` / `driver:{id}:state`, see driver-geo-index.ts — same
 * per-service key ownership as ADR-004's Postgres-per-service rule, just
 * applied to Redis).
 *
 * `SET key value NX EX ttl` is a single atomic Redis command — Redis's
 * single-threaded execution model means two concurrent tryReserve() calls
 * for the same driver are serialized server-side: exactly one gets `OK`,
 * the other gets `null`. This is the race-free primitive Phase 7 exists to
 * demonstrate; no separate Lua script is needed for a plain reserve-or-fail.
 */
export class DriverReservationStore {
  constructor(private readonly redis: Redis) {}

  async tryReserve(driverId: string, rideId: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(reservationKey(driverId), rideId, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async getReservation(driverId: string): Promise<string | null> {
    return this.redis.get(reservationKey(driverId));
  }

  async release(driverId: string): Promise<void> {
    await this.redis.del(reservationKey(driverId));
  }
}
