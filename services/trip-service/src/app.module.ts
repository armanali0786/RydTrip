import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { TripsModule } from './trips/trips.module';

@Module({
  imports: [HealthModule, TripsModule],
})
export class AppModule {}
