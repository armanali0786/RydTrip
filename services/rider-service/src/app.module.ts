import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RidersModule } from './riders/riders.module';

@Module({
  imports: [PrismaModule, HealthModule, RidersModule],
})
export class AppModule {}
