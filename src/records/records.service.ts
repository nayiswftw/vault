import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../prisma/generated/client';
import { RecordType } from '../common/enums/record-type.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { QueryRecordsDto } from './dto/query-records.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { FinancialRecord } from './entities/financial-record.entity';
import { stringify } from 'csv-stringify/sync';

@Injectable()
export class RecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createRecordDto: CreateRecordDto,
    createdByUserId: string,
  ): Promise<FinancialRecord> {
    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.financialRecord.create({
        data: {
          amount: createRecordDto.amount.toString(),
          type: this.toDbRecordType(createRecordDto.type),
          category: createRecordDto.category,
          date: new Date(createRecordDto.date),
          notes: createRecordDto.notes ?? null,
          createdByUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          entityId: created.id,
          entityType: 'FinancialRecord',
          action: 'CREATE',
          userId: createdByUserId,
          newData: JSON.parse(JSON.stringify(created)) as Prisma.InputJsonValue,
        },
      });

      return created;
    });

    return this.toRecordEntity(record);
  }

  async findAll(query: QueryRecordsDto): Promise<{
    data: FinancialRecord[];
    meta: {
      limit: number;
      nextCursor: string | null;
    };
  }> {
    const where = this.buildWhere(query);
    const limit = query.limit ?? 20;

    // We fetch one extra item to check if there is a next page
    const take = limit + 1;
    const skip = query.cursor ? 1 : 0;
    const cursor = query.cursor ? { id: query.cursor } : undefined;

    const records = await this.prisma.financialRecord.findMany({
      where,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take,
      skip,
      cursor,
    });

    let nextCursor: string | null = null;
    if (records.length > limit) {
      const nextItem = records.pop(); // Remove the extra item
      nextCursor = nextItem!.id;
    }

    return {
      data: records.map((record) => this.toRecordEntity(record)),
      meta: {
        limit,
        nextCursor,
      },
    };
  }

  async findOne(recordId: string): Promise<FinancialRecord> {
    const record = await this.prisma.financialRecord.findFirst({
      where: {
        id: recordId,
        deletedAt: null,
      },
    });

    if (!record) {
      throw new NotFoundException(
        'Financial record was not found or has been deleted.',
      );
    }

    return this.toRecordEntity(record);
  }

  async update(
    recordId: string,
    updateRecordDto: UpdateRecordDto,
    userId: string,
  ): Promise<FinancialRecord> {
    const existingRecord = await this.findOne(recordId);
    const data: Prisma.FinancialRecordUpdateInput = {};

    if (updateRecordDto.amount !== undefined) {
      data.amount = updateRecordDto.amount.toString();
    }

    if (updateRecordDto.type !== undefined) {
      data.type = this.toDbRecordType(updateRecordDto.type);
    }

    if (updateRecordDto.category !== undefined) {
      data.category = updateRecordDto.category;
    }

    if (updateRecordDto.date !== undefined) {
      data.date = new Date(updateRecordDto.date);
    }

    if (updateRecordDto.notes !== undefined) {
      data.notes = updateRecordDto.notes;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedRecord = await tx.financialRecord.update({
        where: {
          id: recordId,
        },
        data,
      });

      await tx.auditLog.create({
        data: {
          entityId: updatedRecord.id,
          entityType: 'FinancialRecord',
          action: 'UPDATE',
          userId,
          previousData: JSON.parse(
            JSON.stringify(existingRecord),
          ) as Prisma.InputJsonValue,
          newData: JSON.parse(
            JSON.stringify(updatedRecord),
          ) as Prisma.InputJsonValue,
        },
      });

      return updatedRecord;
    });

    return this.toRecordEntity(updated);
  }

  async remove(
    recordId: string,
    userId: string,
  ): Promise<{ deletedRecordId: string }> {
    const existingRecord = await this.findOne(recordId);

    await this.prisma.$transaction(async (tx) => {
      const softDeleted = await tx.financialRecord.update({
        where: {
          id: recordId,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          entityId: softDeleted.id,
          entityType: 'FinancialRecord',
          action: 'DELETE',
          userId,
          previousData: JSON.parse(
            JSON.stringify(existingRecord),
          ) as Prisma.InputJsonValue,
          newData: JSON.parse(
            JSON.stringify(softDeleted),
          ) as Prisma.InputJsonValue,
        },
      });
    });

    return { deletedRecordId: recordId };
  }

  async getFilteredRecords(query: {
    type?: RecordType;
    category?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<FinancialRecord[]> {
    const where = this.buildWhere(query);
    const records = await this.prisma.financialRecord.findMany({
      where,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });

    return records.map((record) => this.toRecordEntity(record));
  }

  async exportToCsv(query: QueryRecordsDto): Promise<string> {
    const where = this.buildWhere({
      type: query.type,
      category: query.category,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    const records = await this.prisma.financialRecord.findMany({
      where,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      include: {
        createdBy: true,
      },
    });

    const csvData = records.map((record) => ({
      ID: record.id,
      Amount: Number(record.amount).toFixed(2),
      Type: this.toAppRecordType(record.type),
      Category: record.category,
      Date: record.date.toISOString().slice(0, 10),
      Notes: record.notes ?? '',
      'Created By': record.createdBy.email,
      'Created At': record.createdAt.toISOString(),
      'Updated At': record.updatedAt.toISOString(),
    }));

    return stringify(csvData, {
      header: true,
      columns: [
        'ID',
        'Amount',
        'Type',
        'Category',
        'Date',
        'Notes',
        'Created By',
        'Created At',
        'Updated At',
      ],
    });
  }

  private buildWhere(query: {
    type?: RecordType;
    category?: string;
    startDate?: string;
    endDate?: string;
  }): Prisma.FinancialRecordWhereInput {
    if (query.startDate && query.endDate) {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);

      if (start.getTime() > end.getTime()) {
        throw new BadRequestException(
          'startDate must be earlier than endDate.',
        );
      }
    }

    const where: Prisma.FinancialRecordWhereInput = {};

    if (query.type) {
      where.type = this.toDbRecordType(query.type);
    }

    if (query.category) {
      where.category = {
        equals: query.category,
        mode: 'insensitive',
      };
    }

    if (query.startDate || query.endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};

      if (query.startDate) {
        dateFilter.gte = new Date(query.startDate);
      }

      if (query.endDate) {
        dateFilter.lte = new Date(query.endDate);
      }

      where.date = dateFilter;
    }

    where.deletedAt = null;

    return where;
  }

  private toRecordEntity(record: {
    id: string;
    amount: unknown;
    type: string;
    category: string;
    date: Date;
    notes: string | null;
    createdByUserId: string;
    createdAt: Date;
    updatedAt: Date;
  }): FinancialRecord {
    return {
      id: record.id,
      amount: Number(record.amount),
      type: this.toAppRecordType(record.type),
      category: record.category,
      date: record.date.toISOString().slice(0, 10),
      notes: record.notes,
      createdByUserId: record.createdByUserId,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toDbRecordType(type: RecordType): 'INCOME' | 'EXPENSE' {
    if (type === RecordType.Expense) {
      return 'EXPENSE';
    }

    return 'INCOME';
  }

  private toAppRecordType(type: string): RecordType {
    if (type === 'EXPENSE') {
      return RecordType.Expense;
    }

    return RecordType.Income;
  }
}
