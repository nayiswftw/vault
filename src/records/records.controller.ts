import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Logger,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiProduces,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateRecordDto } from './dto/create-record.dto';
import { QueryRecordsDto } from './dto/query-records.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { FinancialRecord } from './entities/financial-record.entity';
import { RecordsService } from './records.service';
import {
  PaginatedRecordsResponseDto,
  DeleteRecordResponseDto,
} from './dto/records-responses.dto';

@ApiTags('Records')
@ApiBearerAuth('access-token')
@Controller('records')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecordsController {
  private readonly logger = new Logger(RecordsController.name);

  constructor(private readonly recordsService: RecordsService) {}

  @Post()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Create a new financial record' })
  @ApiOkResponse({
    type: FinancialRecord,
    description: 'Record created successfully',
  })
  async create(
    @Body() createRecordDto: CreateRecordDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<FinancialRecord> {
    this.logger.log('Action called');
    return await this.recordsService.create(createRecordDto, currentUser.id);
  }

  @Get()
  @Roles(Role.Admin, Role.Analyst)
  @ApiOperation({ summary: 'Get all financial records (paginated)' })
  @ApiOkResponse({
    type: PaginatedRecordsResponseDto,
    description: 'Records retrieved successfully',
  })
  async findAll(
    @Query() query: QueryRecordsDto,
  ): Promise<PaginatedRecordsResponseDto> {
    this.logger.log('Action called');
    return await this.recordsService.findAll(query);
  }

  @Get('export')
  @Roles(Role.Admin, Role.Analyst)
  @ApiOperation({ summary: 'Export financial records to CSV' })
  @ApiProduces('text/csv')
  async export(
    @Query() query: QueryRecordsDto,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log('Action called: Export CSV');
    const csvContent = await this.recordsService.exportToCsv(query);
    const dateStr = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=records-export-${dateStr}.csv`,
    );
    res.status(200).send(csvContent);
  }

  @Get(':id')
  @Roles(Role.Admin, Role.Analyst)
  @ApiOperation({ summary: 'Find one financial record by ID' })
  @ApiOkResponse({
    type: FinancialRecord,
    description: 'Record retrieved successfully',
  })
  async findOne(@Param('id') recordId: string): Promise<FinancialRecord> {
    this.logger.log('Action called');
    return await this.recordsService.findOne(recordId);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Update a financial record' })
  @ApiOkResponse({
    type: FinancialRecord,
    description: 'Record updated successfully',
  })
  async update(
    @Param('id') recordId: string,
    @Body() updateRecordDto: UpdateRecordDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<FinancialRecord> {
    this.logger.log('Action called');
    return await this.recordsService.update(
      recordId,
      updateRecordDto,
      currentUser.id,
    );
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Remove a financial record' })
  @ApiOkResponse({
    type: DeleteRecordResponseDto,
    description: 'Record deleted successfully',
  })
  async remove(
    @Param('id') recordId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<DeleteRecordResponseDto> {
    this.logger.log('Action called');
    return await this.recordsService.remove(recordId, currentUser.id);
  }
}
