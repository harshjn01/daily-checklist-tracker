import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { ChecklistsModule } from '../checklists/checklists.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, ChecklistsModule, NotificationsModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
