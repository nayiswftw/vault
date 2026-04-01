import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { RecordType } from '../../common/enums/record-type.enum';

export class QueryRecordsDto {
  @IsOptional()
  @IsEnum(RecordType)
  @ApiPropertyOptional()
  type?: RecordType;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  category?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional()
  endDate?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional()
  limit?: number;
}
