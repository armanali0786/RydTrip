import { Module } from '@nestjs/common';
import { MetricsModule } from '@rydtrip/observability';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { TripsModule } from './trips/trips.module';

@Module({
  imports: [PrismaModule, HealthModule, MetricsModule, TripsModule],
})
export class AppModule {}
