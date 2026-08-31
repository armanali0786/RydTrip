import { Module } from '@nestjs/common';
import { DispatchModule } from './dispatch/dispatch.module';
import { HealthModule } from './health/health.module';
import { KafkaModule } from './kafka/kafka.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [RedisModule, KafkaModule, HealthModule, DispatchModule],
})
export class AppModule {}
