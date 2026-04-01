import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @ApiProperty()
  name!: string;

  @IsEmail()
  @ApiProperty()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @ApiProperty()
  password!: string;

  @IsOptional()
  @IsEnum(Role)
  @ApiPropertyOptional()
  role?: Role;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isActive?: boolean;
}
