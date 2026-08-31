import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { RidersModule } from './riders/riders.module';

@Module({
  imports: [HealthModule, RidersModule],
})
export class AppModule {}
