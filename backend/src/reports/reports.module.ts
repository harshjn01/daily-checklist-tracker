import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ChecklistsModule } from '../checklists/checklists.module';

@Module({
  imports: [PrismaModule, ChecklistsModule],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
