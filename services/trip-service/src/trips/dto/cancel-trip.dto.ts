import { ApiPropertyOptional } from '@nestjs/swagger';
import { CancellationReason } from '@ridemesh/event-schema';
import { IsEnum, IsOptional } from 'class-validator';

export class CancelTripDto {
  @ApiPropertyOptional({ enum: CancellationReason })
  @IsOptional()
  @IsEnum(CancellationReason)
  reason?: CancellationReason;
}
