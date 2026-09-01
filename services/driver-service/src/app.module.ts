import { Module } from '@nestjs/common';
import { MetricsModule } from '@rydtrip/observability';
import { DriversModule } from './drivers/drivers.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, HealthModule, MetricsModule, DriversModule],
})
export class AppModule {}
