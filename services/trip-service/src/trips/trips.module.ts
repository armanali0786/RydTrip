import { Module } from '@nestjs/common';
import { RideEventsConsumer } from './ride-events.consumer';
import { TripsController } from './trips.controller';
import { TripsRepository } from './trips.repository';
import { TripsService } from './trips.service';

@Module({
  controllers: [TripsController],
  providers: [TripsService, TripsRepository, RideEventsConsumer],
  exports: [TripsService],
})
export class TripsModule {}
