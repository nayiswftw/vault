import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { AuditLogEntryDto } from './dto/audit-logs-response.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAuditLogsDto): Promise<{
    data: AuditLogEntryDto[];
    meta: {
      limit: number;
      nextCursor: string | null;
    };
  }> {
    const where = this.buildWhere(query);
    const limit = query.limit ?? 20;
    const take = limit + 1;
    const skip = query.cursor ? 1 : 0;
    const cursor = query.cursor ? { id: query.cursor } : undefined;

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      skip,
      cursor,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (logs.length > limit) {
      const nextItem = logs.pop();
      nextCursor = nextItem!.id;
    }

    return {
      data: logs.map((log) => ({
        id: log.id,
        entityId: log.entityId,
        entityType: log.entityType,
        action: log.action,
        userId: log.userId,
        createdAt: log.createdAt.toISOString(),
        previousData:
          (log.previousData as Record<string, unknown> | null) ?? null,
        newData: (log.newData as Record<string, unknown> | null) ?? null,
        actor: {
          id: log.user.id,
          email: log.user.email,
          role: String(log.user.role).toLowerCase(),
        },
      })),
      meta: {
        limit,
        nextCursor,
      },
    };
  }

  private buildWhere(query: QueryAuditLogsDto): Prisma.AuditLogWhereInput {
    if (query.startDate && query.endDate) {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);

      if (start.getTime() > end.getTime()) {
        throw new BadRequestException(
          'startDate must be earlier than endDate.',
        );
      }
    }

    const where: Prisma.AuditLogWhereInput = {};

    if (query.entityType) {
      where.entityType = {
        equals: query.entityType,
        mode: 'insensitive',
      };
    }

    if (query.entityId) {
      where.entityId = query.entityId;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.startDate || query.endDate) {
      const createdAt: Prisma.DateTimeFilter = {};

      if (query.startDate) {
        createdAt.gte = new Date(query.startDate);
      }

      if (query.endDate) {
        createdAt.lte = new Date(query.endDate);
      }

      where.createdAt = createdAt;
    }

    return where;
  }
}
