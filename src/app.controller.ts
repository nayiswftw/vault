import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import {
  HealthResponseDto,
  ReadinessResponseDto,
} from './dto/app-response.dto';

@ApiTags('App')
@SkipThrottle()
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Get health status' })
  @ApiOkResponse({
    type: HealthResponseDto,
    description: 'Health status retrieved successfully',
  })
  @Get('health')
  getHealth(): HealthResponseDto {
    this.logger.log('getHealth called');
    return this.appService.getHealth();
  }

  @ApiOperation({ summary: 'Get readiness status' })
  @ApiOkResponse({
    type: ReadinessResponseDto,
    description: 'Readiness status retrieved successfully',
  })
  @Get('ready')
  async getReadiness(): Promise<ReadinessResponseDto> {
    this.logger.log('getReadiness called');
    return await this.appService.getReadiness();
  }
}
