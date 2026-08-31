import { ApiProperty } from '@nestjs/swagger';
import { DriverStatus } from '@ridemesh/event-schema';
import { IsEnum } from 'class-validator';

export class UpdateDriverStatusDto {
  @ApiProperty({ enum: DriverStatus, description: 'Target status to transition into' })
  @IsEnum(DriverStatus)
  status!: DriverStatus;
}
