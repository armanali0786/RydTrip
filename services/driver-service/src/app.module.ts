import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { DriversModule } from './drivers/drivers.module';

@Module({
  imports: [HealthModule, DriversModule],
})
export class AppModule {}
