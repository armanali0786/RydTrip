import { Module } from '@nestjs/common';
import { RidersController } from './riders.controller';
import { RidersRepository } from './riders.repository';
import { RidersService } from './riders.service';

@Module({
  controllers: [RidersController],
  providers: [RidersService, RidersRepository],
  exports: [RidersService],
})
export class RidersModule {}
