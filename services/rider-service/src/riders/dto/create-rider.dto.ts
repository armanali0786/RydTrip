import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateRiderDto {
  @ApiProperty({ example: 'Priya Sharma' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: 'priya@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'a-strong-password', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
