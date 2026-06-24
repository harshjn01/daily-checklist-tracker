import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ChecklistsService } from '../checklists/checklists.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Role, UserStatus } from '../types/enums';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private checklistsService: ChecklistsService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
  ) {}

  // Run daily. Default is 7 PM (19:00). Configurable via environment.
  // Using standard cron syntax: "0 19 * * *"
  @Cron(process.env.DAILY_REMINDER_CRON || '0 19 * * *')
  async handleDailyChecklistRun() {
    this.logger.log('Starting daily checklist completion check...');

    const todayStr = new Date().toISOString().split('T')[0];
    const activeUsers = await this.prisma.user.findMany({
      where: { role: Role.USER, status: UserStatus.ACTIVE },
    });

    const admins = await this.prisma.user.findMany({
      where: { role: Role.ADMIN, status: UserStatus.ACTIVE },
    });

    const incompleteUsersList: Array<{ name: string; email: string; completedCount: number; totalCount: number }> = [];

    for (const user of activeUsers) {
      try {
        const assigned = await this.checklistsService.findAssignedForToday(user.id, todayStr);
        const total = assigned.length;
        if (total === 0) continue; // No checklists assigned to this user today

        const completed = assigned.filter((a) => a.isCompleted).length;
        const pending = total - completed;

        if (completed < total) {
          // User has incomplete tasks
          incompleteUsersList.push({
            name: user.name,
            email: user.email,
            completedCount: completed,
            totalCount: total,
          });

          // 1. Send in-app notification to the user
          await this.notificationsService.create(
            user.id,
            'Checklist Reminder',
            `You have ${pending} pending task(s) for today. Please complete them before the day ends.`,
          );

          // 2. Send reminder email to the user
          await this.emailService.sendDailyReminder(user.email, user.name, pending);
        }
      } catch (err) {
        this.logger.error(`Error checking checklist status for user ${user.email}`, err);
      }
    }

    // 3. Notify admins if there are incomplete checklists
    if (incompleteUsersList.length > 0) {
      for (const admin of admins) {
        try {
          // Create in-app notification for admin
          await this.notificationsService.create(
            admin.id,
            'Incomplete Checklists Alert',
            `${incompleteUsersList.length} user(s) failed to complete their checklists today.`,
          );

          // Send email report to admin
          await this.emailService.sendIncompleteNotification(admin.email, admin.name, incompleteUsersList);
        } catch (err) {
          this.logger.error(`Error notifying admin ${admin.email}`, err);
        }
      }
    }

    // 4. Data retention cleanup: Delete checklist completions older than 7 days
    try {
      const cutOffDate = new Date();
      cutOffDate.setDate(cutOffDate.getDate() - 7);
      const cutOffDateStr = cutOffDate.toISOString().split('T')[0];

      const deleteRes = await this.prisma.checklistCompletion.deleteMany({
        where: {
          date: {
            lt: cutOffDateStr,
          },
        },
      });
      this.logger.log(`Data cleanup run: deleted ${deleteRes.count} completion records older than 7 days (${cutOffDateStr})`);
    } catch (err) {
      this.logger.error('Failed to run data retention cleanup', err);
    }

    // 5. Create Audit Log of the run
    await this.prisma.auditLog.create({
      data: {
        action: 'CRON_CHECKLIST_RUN',
        details: JSON.stringify({
          date: todayStr,
          totalUsersChecked: activeUsers.length,
          incompleteUsersCount: incompleteUsersList.length,
        }),
      },
    });

    this.logger.log(`Daily checklist check completed. Incomplete users: ${incompleteUsersList.length}`);
  }
}
