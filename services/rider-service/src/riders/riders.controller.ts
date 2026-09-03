import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateRiderDto } from './dto/create-rider.dto';
import { LoginRiderDto } from './dto/login-rider.dto';
import { RidersService } from './riders.service';

@ApiTags('riders')
@Controller('riders')
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @Post()
  async create(@Body() dto: CreateRiderDto) {
    return this.ridersService.create(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginRiderDto) {
    return this.ridersService.login(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ridersService.findById(id);
  }

  // PII-limited (name + phone only, no email) — this is what lets the
  // driver assigned to this rider's trip see who they're picking up and
  // call them, without exposing the full profile GET :id returns.
  @Get(':id/contact')
  async findContact(@Param('id') id: string) {
    return this.ridersService.findContact(id);
  }
}
