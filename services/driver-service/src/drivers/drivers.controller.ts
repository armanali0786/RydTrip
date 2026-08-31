import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateDriverDto } from './dto/create-driver.dto';
import { LoginDriverDto } from './dto/login-driver.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { DriversService } from './drivers.service';

@ApiTags('drivers')
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  async create(@Body() dto: CreateDriverDto) {
    return this.driversService.create(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDriverDto) {
    return this.driversService.login(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.driversService.findById(id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateDriverStatusDto) {
    return this.driversService.updateStatus(id, dto.status);
  }
}
