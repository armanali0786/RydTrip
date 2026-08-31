import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CancelTripDto } from './dto/cancel-trip.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { TripsService } from './trips.service';

@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  /**
   * Phase 2/3 bridge endpoint — see TripsService.create(). Removed from the
   * public contract once ride.requested consumption replaces it (Phase 5+7);
   * see docs/architecture/api-contracts.md, which does not list this path.
   */
  @Post()
  async create(@Body() dto: CreateTripDto) {
    return this.tripsService.create(dto);
  }

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
