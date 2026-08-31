import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type Redis from 'ioredis';
import { createRedisClient, DriverGeoIndex } from '@rydtrip/redis-client';

@Injectable()
export class RedisService extends DriverGeoIndex implements OnModuleInit, OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    const client = createRedisClient(process.env.REDIS_URL ?? 'redis://localhost:6379');
    super(client);
    this.client = client;
  }

  async onModuleInit(): Promise<void> {
    // ioredis connects lazily on first command by default in v5, but a real
    // health signal here is worth the ~1 round trip at boot.
    await this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }
}
