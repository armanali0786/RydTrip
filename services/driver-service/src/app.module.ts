import { Module } from '@nestjs/common';
import { DriversModule } from './drivers/drivers.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, HealthModule, DriversModule],
})
export class AppModule {}
