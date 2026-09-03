import type Redis from 'ioredis';

const GEO_KEY = 'drivers:geo';

function stateKey(driverId: string): string {
  return `driver:${driverId}:state`;
}

export interface DriverLocation {
  driverId: string;
  lat: number;
  lng: number;
}

export interface NearbyDriver {
  driverId: string;
  lat: number;
  lng: number;
  distanceKm: number;
}

export interface OnlineDriver {
  driverId: string;
  lat: number;
  lng: number;
}

/**
 * Redis GEO doesn't support per-member TTL — only whole keys expire. So
 * staleness is tracked with a companion `driver:{id}:state` hash whose TTL is
 * refreshed on every location update (the "heartbeat"). GEOSEARCH itself never
 * expires a member on its own; findNearby() below post-filters the geo
 * candidates against that heartbeat key and lazily evicts anything whose
 * heartbeat has lapsed, matching the "TTL expiry -> invisible to GEO search"
 * behavior described in docs/architecture/overview.md.
 */
export class DriverGeoIndex {
  constructor(private readonly redis: Redis) {}

  async upsertLocation(driverId: string, lat: number, lng: number, heartbeatTtlSeconds: number): Promise<void> {
    const key = stateKey(driverId);
    const pipeline = this.redis.pipeline();
    pipeline.call('GEOADD', GEO_KEY, lng, lat, driverId);
    pipeline.hset(key, 'lat', String(lat), 'lng', String(lng), 'updatedAt', new Date().toISOString());
    pipeline.expire(key, heartbeatTtlSeconds);
    await pipeline.exec();
  }

  async isStale(driverId: string): Promise<boolean> {
    const exists = await this.redis.exists(stateKey(driverId));
    return exists === 0;
  }

  async findNearby(lat: number, lng: number, radiusKm: number, limit: number): Promise<NearbyDriver[]> {
    const raw = (await this.redis.call(
      'GEOSEARCH',
      GEO_KEY,
      'FROMLONLAT',
      lng,
      lat,
      'BYRADIUS',
      radiusKm,
      'km',
      'ASC',
      'COUNT',
      limit,
      'WITHCOORD',
      'WITHDIST',
    )) as [string, string, [string, string]][];

    if (raw.length === 0) {
      return [];
    }

    // Redis GEOSEARCH doesn't know about heartbeat expiry, so a driver can
    // still be a geometric candidate after going stale — check which
    // candidates still have a live heartbeat, in one round trip.
    const stalenessPipeline = this.redis.pipeline();
    for (const [driverId] of raw) {
      stalenessPipeline.exists(stateKey(driverId));
    }
    const stalenessResults = await stalenessPipeline.exec();

    const live: NearbyDriver[] = [];
    const staleDriverIds: string[] = [];

    raw.forEach(([driverId, distance, [candidateLng, candidateLat]], index) => {
      const existsResult = stalenessResults?.[index];
      const exists = existsResult && !existsResult[0] ? (existsResult[1] as number) : 0;
      if (exists === 0) {
        staleDriverIds.push(driverId);
        return;
      }
      live.push({
        driverId,
        lat: Number(candidateLat),
        lng: Number(candidateLng),
        distanceKm: Number(distance),
      });
    });

    if (staleDriverIds.length > 0) {
      // Lazy cleanup: no point keeping a geometrically-findable member around
      // once its heartbeat has lapsed.
      await this.redis.zrem(GEO_KEY, ...staleDriverIds);
    }

    return live;
  }

  /**
   * No reference point needed — just any driver whose heartbeat is still
   * live, picked arbitrarily off the geo set. Used as a last-resort seed
   * (e.g. a rider's initial pickup point before they've typed/detected one)
   * so there's a real, currently-online location to search around instead
   * of a fixed hardcoded city.
   */
  async findAnyOnline(limit: number): Promise<OnlineDriver[]> {
    const memberIds = await this.redis.zrange(GEO_KEY, 0, limit - 1);
    if (memberIds.length === 0) {
      return [];
    }

    const positions = (await this.redis.call('GEOPOS', GEO_KEY, ...memberIds)) as ([string, string] | null)[];

    const stalenessPipeline = this.redis.pipeline();
    for (const driverId of memberIds) {
      stalenessPipeline.exists(stateKey(driverId));
    }
    const stalenessResults = await stalenessPipeline.exec();

    const live: OnlineDriver[] = [];
    const staleDriverIds: string[] = [];

    memberIds.forEach((driverId, index) => {
      const pos = positions[index];
      const existsResult = stalenessResults?.[index];
      const exists = existsResult && !existsResult[0] ? (existsResult[1] as number) : 0;
      if (exists === 0 || !pos) {
        staleDriverIds.push(driverId);
        return;
      }
      live.push({ driverId, lat: Number(pos[1]), lng: Number(pos[0]) });
    });

    if (staleDriverIds.length > 0) {
      await this.redis.zrem(GEO_KEY, ...staleDriverIds);
    }

    return live;
  }
}
