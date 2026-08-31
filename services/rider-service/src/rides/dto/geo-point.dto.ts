import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class GeoPointDto {
  @ApiProperty({ example: 12.9716 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: 77.5946 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}
