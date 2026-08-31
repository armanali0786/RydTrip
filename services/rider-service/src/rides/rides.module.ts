import { Module } from '@nestjs/common';
import { RidersModule } from '../riders/riders.module';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';

@Module({
  imports: [RidersModule],
  controllers: [RidesController],
  providers: [RidesService],
})
export class RidesModule {}
