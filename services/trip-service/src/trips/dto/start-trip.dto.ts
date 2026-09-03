import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class StartTripDto {
  @ApiProperty({ description: 'The 4-digit pickup code the rider reads out to the driver', example: '4821' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'otp must be exactly 4 digits' })
  otp!: string;
}
