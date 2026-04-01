import { Module } from '@nestjs/common';
import { RecordsModule } from '../records/records.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [RecordsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
