import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth(): { status: 'ok'; service: string } {
    return {
      status: 'ok',
      service: 'finance-backend-api',
    };
  }

  async getReadiness(): Promise<{
    status: 'ok';
    service: string;
    database: 'up';
    timestamp: string;
  }> {
    const timestamp = new Date().toISOString();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'finance-backend-api',
        database: 'down',
        timestamp,
      });
    }

    return {
      status: 'ok',
      service: 'finance-backend-api',
      database: 'up',
      timestamp,
    };
  }
}
