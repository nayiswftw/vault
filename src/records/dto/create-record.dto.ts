import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateRecordDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @ApiProperty()
  amount!: number;

  @IsEnum(RecordType)
  @ApiProperty()
  type!: RecordType;

  @IsString()
  @MaxLength(80)
  @ApiProperty()
  category!: string;

  @IsDateString()
  @ApiProperty()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiPropertyOptional()
  notes?: string;
}
