import { randomUUID } from 'node:crypto';
import { Body, Controller, HttpCode, HttpStatus, Param, Post, Headers } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CancelRideDto } from './dto/cancel-ride.dto';
import { CreateRideDto } from './dto/create-ride.dto';
import { RidesService } from './rides.service';

@ApiTags('rides')
@Controller('rides')
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async create(@Body() dto: CreateRideDto, @Headers('x-correlation-id') correlationId?: string) {
    return this.ridesService.create(dto, correlationId ?? randomUUID());
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.ACCEPTED)
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelRideDto,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.ridesService.cancel(id, correlationId ?? randomUUID(), dto.reason);
  }
}
