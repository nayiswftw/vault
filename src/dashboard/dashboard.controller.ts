import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { DashboardService } from './dashboard.service';
import { DashboardSummaryResponseDto } from './dto/dashboard-response.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @UseInterceptors(CacheInterceptor)
  @Roles(Role.Admin, Role.Analyst, Role.Viewer)
  @ApiOperation({ summary: 'Get dashboard summary' })
  @ApiOkResponse({
    type: DashboardSummaryResponseDto,
    description: 'Dashboard summary retrieved successfully',
  })
  async getSummary(
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardSummaryResponseDto> {
    this.logger.log('getSummary called');
    return await this.dashboardService.getSummary(query);
  }
}
