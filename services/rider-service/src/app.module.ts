import { Module } from '@nestjs/common';
import { MetricsModule } from '@rydtrip/observability';
import { HealthModule } from './health/health.module';
import { KafkaModule } from './kafka/kafka.module';
import { PrismaModule } from './prisma/prisma.module';
import { RidersModule } from './riders/riders.module';
import { RidesModule } from './rides/rides.module';

@Module({
  imports: [PrismaModule, KafkaModule, HealthModule, MetricsModule, RidersModule, RidesModule],
})
export class AppModule {}
