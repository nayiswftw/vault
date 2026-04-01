import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { RecordType } from '../../common/enums/record-type.enum';

export class UpdateRecordDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @ApiPropertyOptional()
  amount?: number;

  @IsOptional()
  @IsEnum(RecordType)
  @ApiPropertyOptional()
  type?: RecordType;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @ApiPropertyOptional()
  category?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiPropertyOptional()
  notes?: string;
}
