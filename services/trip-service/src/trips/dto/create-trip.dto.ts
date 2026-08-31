import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsUUID, ValidateNested } from 'class-validator';
import { GeoPointDto } from './geo-point.dto';

/**
 * Phase 2 bridge only: once Kafka lands (Phase 5), trips are created by
 * consuming `ride.requested` rather than by a direct POST. See
 * docs/adr/003-rest-vs-events.md.
 */
export class CreateTripDto {
  @ApiProperty()
  @IsUUID()
  riderId!: string;

  @ApiProperty({ type: GeoPointDto })
  @ValidateNested()
  @Type(() => GeoPointDto)
  pickup!: GeoPointDto;

  @ApiProperty({ type: GeoPointDto })
  @ValidateNested()
  @Type(() => GeoPointDto)
  destination!: GeoPointDto;
}
