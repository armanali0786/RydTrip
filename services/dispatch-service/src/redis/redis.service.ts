import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type Redis from 'ioredis';
import { createRedisClient, DriverGeoIndex, DriverReservationStore } from '@rydtrip/redis-client';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: Redis;
  readonly geoIndex: DriverGeoIndex;
  readonly reservations: DriverReservationStore;

  constructor() {
    this.client = createRedisClient(process.env.REDIS_URL ?? 'redis://localhost:6379');
    this.geoIndex = new DriverGeoIndex(this.client);
    this.reservations = new DriverReservationStore(this.client);
  }

  async onModuleInit(): Promise<void> {
    await this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }
}
