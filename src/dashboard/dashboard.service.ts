import { Injectable } from '@nestjs/common';
import { RecordType } from '../common/enums/record-type.enum';
import type { FinancialRecord } from '../records/entities/financial-record.entity';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { RecordsService } from '../records/records.service';

interface CategorySummary {
  category: string;
  income: number;
  expenses: number;
  netBalance: number;
}

interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  netBalance: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly recordsService: RecordsService) {}

  async getSummary(query: DashboardQueryDto): Promise<{
    period: {
      startDate?: string;
      endDate?: string;
    };
    totals: {
      income: number;
      expenses: number;
      netBalance: number;
    };
    categoryBreakdown: CategorySummary[];
    recentActivity: {
      id: string;
      date: string;
      type: RecordType;
      amount: number;
      category: string;
      notes: string | null;
    }[];
    monthlyTrends: MonthlyTrend[];
  }> {
    const filteredRecords = await this.recordsService.getFilteredRecords({
      startDate: query.startDate,
      endDate: query.endDate,
    });

    const income = this.round(
      filteredRecords
        .filter((record) => record.type === RecordType.Income)
        .reduce((sum, record) => sum + record.amount, 0),
    );

    const expenses = this.round(
      filteredRecords
        .filter((record) => record.type === RecordType.Expense)
        .reduce((sum, record) => sum + record.amount, 0),
    );

    const categoryMap = new Map<string, CategorySummary>();

    for (const record of filteredRecords) {
      const existingCategory = categoryMap.get(record.category) ?? {
        category: record.category,
        income: 0,
        expenses: 0,
        netBalance: 0,
      };

      if (record.type === RecordType.Income) {
        existingCategory.income += record.amount;
      } else {
        existingCategory.expenses += record.amount;
      }

      existingCategory.netBalance =
        existingCategory.income - existingCategory.expenses;

      categoryMap.set(record.category, {
        category: existingCategory.category,
        income: this.round(existingCategory.income),
        expenses: this.round(existingCategory.expenses),
        netBalance: this.round(existingCategory.netBalance),
      });
    }

    const recentActivity = filteredRecords.slice(0, 5).map((record) => ({
      id: record.id,
      date: record.date,
      type: record.type,
      amount: record.amount,
      category: record.category,
      notes: record.notes,
    }));

    const monthlyTrends = this.buildMonthlyTrends(
      filteredRecords,
      query.months ?? 6,
    );

    return {
      period: {
        startDate: query.startDate,
        endDate: query.endDate,
      },
      totals: {
        income,
        expenses,
        netBalance: this.round(income - expenses),
      },
      categoryBreakdown: Array.from(categoryMap.values()).sort((left, right) =>
        left.category.localeCompare(right.category),
      ),
      recentActivity,
      monthlyTrends,
    };
  }

  private buildMonthlyTrends(
    records: FinancialRecord[],
    months: number,
  ): MonthlyTrend[] {
    const now = new Date();
    const monthKeys: string[] = [];

    for (let offset = months - 1; offset >= 0; offset -= 1) {
      const date = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1),
      );
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      monthKeys.push(key);
    }

    const monthlyMap = new Map<string, MonthlyTrend>(
      monthKeys.map((key) => [
        key,
        {
          month: key,
          income: 0,
          expenses: 0,
          netBalance: 0,
        },
      ]),
    );

    for (const record of records) {
      const date = new Date(record.date);
      if (Number.isNaN(date.getTime())) {
        continue;
      }

      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      const trend = monthlyMap.get(key);
      if (!trend) {
        continue;
      }

      if (record.type === RecordType.Income) {
        trend.income = this.round(trend.income + record.amount);
      } else {
        trend.expenses = this.round(trend.expenses + record.amount);
      }

      trend.netBalance = this.round(trend.income - trend.expenses);
      monthlyMap.set(key, trend);
    }

    return monthKeys.map((key) => monthlyMap.get(key) as MonthlyTrend);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
