import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';

export const VEHICLE_TYPES = ['SEDAN', 'SUV', 'HATCHBACK', 'AUTO', 'BIKE'] as const;

export class CreateDriverDto {
  @ApiProperty({ example: 'Asha Rao' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '+919812345670' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: 'asha@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'a-strong-password', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ enum: VEHICLE_TYPES, example: 'SEDAN' })
  @IsString()
  @IsIn(VEHICLE_TYPES)
  vehicleType!: string;
}
