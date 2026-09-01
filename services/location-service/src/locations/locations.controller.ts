import { randomUUID } from 'node:crypto';
import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { tagCorrelationId } from '@rydtrip/observability';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@Controller()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post('drivers/:id/location')
  @HttpCode(HttpStatus.ACCEPTED)
  async updateLocation(
    @Param('id') driverId: string,
    @Body() dto: UpdateLocationDto,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    const cid = correlationId ?? randomUUID();
    tagCorrelationId(cid);
    await this.locationsService.updateLocation(driverId, dto.lat, dto.lng, cid);
    return { driverId, status: 'ACCEPTED' };
  }

  // Not in the original Phase 1 api-contracts.md sketch — added in Phase 6 to
  // demonstrate GEOSEARCH correctness (see PHASES.md exit criteria). Dispatch
  // Service (Phase 7) will be the real consumer of nearby-driver search.
  @Get('drivers/nearby')
  async findNearby(@Query() query: NearbyQueryDto) {
    const drivers = await this.locationsService.findNearby(query.lat, query.lng, query.radiusKm, query.limit);
    return { drivers };
  }
}
