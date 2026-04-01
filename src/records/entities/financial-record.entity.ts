import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecordType } from '../../common/enums/record-type.enum';

export class FinancialRecord {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty({ enum: RecordType })
  type!: RecordType;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  date!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdByUserId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
