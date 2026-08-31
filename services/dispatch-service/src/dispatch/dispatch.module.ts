import { Module } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { RideRequestedConsumer } from './ride-requested.consumer';

@Module({
  providers: [DispatchService, RideRequestedConsumer],
  exports: [DispatchService],
})
export class DispatchModule {}
