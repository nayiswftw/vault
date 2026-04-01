import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AuditActorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  role!: string;
}

export class AuditLogEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  entityId!: string;

  @ApiProperty()
  entityType!: string;

  @ApiProperty({ description: 'CREATE, UPDATE, DELETE' })
  action!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional({
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  previousData!: Record<string, unknown> | null;

  @ApiPropertyOptional({
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  newData!: Record<string, unknown> | null;

  @ApiProperty({ type: AuditActorDto })
  actor!: AuditActorDto;
}

class PaginatedAuditMetaDto {
  @ApiProperty()
  limit!: number;

  @ApiProperty({ nullable: true })
  nextCursor!: string | null;
}

export class PaginatedAuditLogsResponseDto {
  @ApiProperty({ type: [AuditLogEntryDto] })
  data!: AuditLogEntryDto[];

  @ApiProperty({ type: PaginatedAuditMetaDto })
  meta!: PaginatedAuditMetaDto;
}
