import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @ApiProperty()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @ApiProperty()
  password!: string;
}
