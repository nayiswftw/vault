import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditService } from './audit.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { PaginatedAuditLogsResponseDto } from './dto/audit-logs-response.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth('access-token')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  private readonly logger = new Logger(AuditController.name);

  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Get audit logs (admin only)' })
  @ApiOkResponse({
    type: PaginatedAuditLogsResponseDto,
    description: 'Audit logs retrieved successfully.',
  })
  async findAll(
    @Query() query: QueryAuditLogsDto,
  ): Promise<PaginatedAuditLogsResponseDto> {
    this.logger.log('findAll called');
    return await this.auditService.findAll(query);
  }
}
