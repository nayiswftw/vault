import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const auditActions = ['CREATE', 'UPDATE', 'DELETE'] as const;

export class QueryAuditLogsDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filter by entity type (for example, FinancialRecord).',
  })
  entityType?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Filter by entity id.' })
  entityId?: string;

  @IsOptional()
  @IsIn(auditActions)
  @ApiPropertyOptional({ enum: auditActions })
  action?: (typeof auditActions)[number];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Filter by actor user id.' })
  userId?: string;

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
  @ApiPropertyOptional({ default: 20 })
  limit?: number;
}
