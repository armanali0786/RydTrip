import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsNotEmpty } from 'class-validator';

// Only contact/display fields are editable here — KYC documents
// (license/registration/insurance/permit numbers) stay immutable through
// this endpoint since they're verified at registration, not something a
// driver should be able to silently rewrite from their profile screen.
export class UpdateDriverDto {
  @ApiPropertyOptional({ example: 'Arjun Mehta' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @ApiPropertyOptional({ example: 'arjun@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Bengaluru' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  city?: string;
}
