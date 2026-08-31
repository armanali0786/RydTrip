import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDriverDto {
  @ApiProperty({ example: 'asha@example.com', description: 'Email or phone number' })
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password!: string;
}
