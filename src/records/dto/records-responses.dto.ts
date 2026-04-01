import { ApiProperty } from '@nestjs/swagger';
import { FinancialRecord } from '../entities/financial-record.entity';

class PaginatedMetaDto {
  @ApiProperty()
  limit!: number;

  @ApiProperty({ nullable: true })
  nextCursor!: string | null;
}

export class PaginatedRecordsResponseDto {
  @ApiProperty({ type: [FinancialRecord] })
  data!: FinancialRecord[];

  @ApiProperty()
  meta!: PaginatedMetaDto;
}

export class DeleteRecordResponseDto {
  @ApiProperty()
  deletedRecordId!: string;
}
