import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class DashboardPeriodDto {
  @ApiPropertyOptional()
  startDate?: string;

  @ApiPropertyOptional()
  endDate?: string;
}

class DashboardTotalsDto {
  @ApiProperty()
  income!: number;

  @ApiProperty()
  expenses!: number;

  @ApiProperty()
  netBalance!: number;
}

class DashboardCategoryBreakdownDto {
  @ApiProperty()
  category!: string;

  @ApiProperty()
  income!: number;

  @ApiProperty()
  expenses!: number;

  @ApiProperty()
  netBalance!: number;
}

class DashboardRecentActivityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  date!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  category!: string;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;
}

class DashboardTrendDto {
  @ApiProperty()
  month!: string;

  @ApiProperty()
  income!: number;

  @ApiProperty()
  expenses!: number;

  @ApiProperty()
  netBalance!: number;
}

export class DashboardSummaryResponseDto {
  @ApiProperty()
  period!: DashboardPeriodDto;

  @ApiProperty()
  totals!: DashboardTotalsDto;

  @ApiProperty({ type: [DashboardCategoryBreakdownDto] })
  categoryBreakdown!: DashboardCategoryBreakdownDto[];

  @ApiProperty({ type: [DashboardRecentActivityDto] })
  recentActivity!: DashboardRecentActivityDto[];

  @ApiProperty({ type: [DashboardTrendDto] })
  monthlyTrends!: DashboardTrendDto[];
}
