import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type Redis from 'ioredis';
import { createRedisClient, DriverGeoIndex, DriverReservationStore, IdempotencyStore } from '@rydtrip/redis-client';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: Redis;
  readonly geoIndex: DriverGeoIndex;
  readonly reservations: DriverReservationStore;
  /** Dispatch Service's idempotency ledger (Phase 8) — see IdempotencyStore's docstring for why Redis, not Postgres. */
  readonly idempotency: IdempotencyStore;

  constructor() {
    this.client = createRedisClient(process.env.REDIS_URL ?? 'redis://localhost:6379');
    this.geoIndex = new DriverGeoIndex(this.client);
    this.reservations = new DriverReservationStore(this.client);
    this.idempotency = new IdempotencyStore(this.client);
  }

  async onModuleInit(): Promise<void> {
    await this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }
}
