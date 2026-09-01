import { Module } from '@nestjs/common';
import { MetricsModule } from '@rydtrip/observability';
import { HealthModule } from './health/health.module';
import { KafkaModule } from './kafka/kafka.module';
import { LocationsModule } from './locations/locations.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [RedisModule, KafkaModule, HealthModule, MetricsModule, LocationsModule],
})
export class AppModule {}
