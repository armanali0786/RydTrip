import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CancelTripDto } from './dto/cancel-trip.dto';
import { TripsService } from './trips.service';

@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  // No POST / here — trips are created by consuming ride.requested (Phase 5,
  // see RideEventsConsumer), not via a direct HTTP call. The Phase 2/3 bridge
  // endpoint that used to live here is retired.

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tripsService.findById(id);
  }

  @Post(':id/driver-arrived')
  async driverArrived(@Param('id') id: string) {
    return this.tripsService.markDriverArrived(id);
  }

  @Post(':id/start')
  async start(@Param('id') id: string) {
    return this.tripsService.start(id);
  }

  @Post(':id/complete')
  async complete(@Param('id') id: string) {
    return this.tripsService.complete(id);
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Body() dto: CancelTripDto) {
    return this.tripsService.cancel(id, dto.reason);
  }
}
