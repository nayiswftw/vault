import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class DashboardQueryDto {
  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  @ApiPropertyOptional()
  months?: number;
}
