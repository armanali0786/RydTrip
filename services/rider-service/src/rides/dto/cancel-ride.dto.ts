import { ApiPropertyOptional } from '@nestjs/swagger';
import { CancellationReason } from '@rydtrip/event-schema';
import { IsEnum, IsOptional } from 'class-validator';

export class CancelRideDto {
  @ApiPropertyOptional({ enum: CancellationReason })
  @IsOptional()
  @IsEnum(CancellationReason)
  reason?: CancellationReason;
}
