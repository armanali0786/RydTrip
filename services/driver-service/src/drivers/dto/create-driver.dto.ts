import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

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

  @ApiProperty({ example: 'Hyderabad', description: 'Onboarding city — drives which documents are suggested as required' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ example: 'DL-0420110149646', description: 'Driving Licence number' })
  @IsString()
  @IsNotEmpty()
  licenseNumber!: string;

  @ApiProperty({ example: 'TS09EA1234', description: 'Vehicle Registration Certificate (RC) number' })
  @IsString()
  @IsNotEmpty()
  vehicleRegistrationNumber!: string;

  @ApiProperty({ example: 'POL-889233445', description: 'Vehicle insurance policy number' })
  @IsString()
  @IsNotEmpty()
  insurancePolicyNumber!: string;

  @ApiPropertyOptional({ example: 'PMT-TS-2024-8871', description: 'Commercial/taxi permit number — required in some cities' })
  @IsOptional()
  @IsString()
  permitNumber?: string;
}
