import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChecklistsService } from '../checklists/checklists.service';
import { Role, UserStatus } from '../types/enums';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private checklistsService: ChecklistsService,
  ) {}

  // Helper to format date object to YYYY-MM-DD
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Helper to get past dates
  private getPastDates(days: number): string[] {
    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(this.formatDate(d));
    }
    return dates;
  }

  async getAdminDashboard(todayStr: string) {
    // 1. User stats
    const totalUsers = await this.prisma.user.count({ where: { role: Role.USER } });
    const activeUsers = await this.prisma.user.count({ where: { role: Role.USER, status: UserStatus.ACTIVE } });

    // 2. Daily completion stats
    const users = await this.prisma.user.findMany({
      where: { role: Role.USER, status: UserStatus.ACTIVE },
      select: { id: true, name: true },
    });

    let completedToday = 0;
    let pendingToday = 0;
    let totalAssignedTasks = 0;
    let completedTasksCount = 0;

    const incompleteUsersList: Array<{ userId: string; name: string; completed: number; total: number }> = [];

    for (const user of users) {
      const assigned = await this.checklistsService.findAssignedForToday(user.id, todayStr);
      const total = assigned.length;
      if (total === 0) continue;

      const completed = assigned.filter((a) => a.isCompleted).length;
      totalAssignedTasks += total;
      completedTasksCount += completed;

      if (completed === total) {
        completedToday++;
      } else {
        pendingToday++;
        incompleteUsersList.push({
          userId: user.id,
          name: user.name,
          completed,
          total,
        });
      }
    }

    const completionPercentage = totalAssignedTasks > 0 ? Math.round((completedTasksCount / totalAssignedTasks) * 100) : 0;

    // 3. Chart data (Daily completion rate for last 7 days)
    const last7Days = this.getPastDates(7);
    const dailyTrend = [];
    for (const dateVal of last7Days) {
      let dailyTotalTasks = 0;
      let dailyCompletedTasks = 0;

      for (const user of users) {
        const assigned = await this.checklistsService.findAssignedForToday(user.id, dateVal);
        dailyTotalTasks += assigned.length;
        dailyCompletedTasks += assigned.filter((a) => a.isCompleted).length;
      }

      const rate = dailyTotalTasks > 0 ? Math.round((dailyCompletedTasks / dailyTotalTasks) * 100) : 0;
      dailyTrend.push({ date: dateVal, completionRate: rate });
    }

    // 4. Weekly trend (Last 4 weeks)
    const weeklyTrend = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i * 7 - 6);
      const end = new Date();
      end.setDate(end.getDate() - i * 7);

      let weeklyTotal = 0;
      let weeklyCompleted = 0;

      // Loop over dates in the week
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dStr = this.formatDate(d);
        for (const user of users) {
          const assigned = await this.checklistsService.findAssignedForToday(user.id, dStr);
          weeklyTotal += assigned.length;
          weeklyCompleted += assigned.filter((a) => a.isCompleted).length;
        }
      }

      const rate = weeklyTotal > 0 ? Math.round((weeklyCompleted / weeklyTotal) * 100) : 0;
      weeklyTrend.push({ name: `Week -${i}`, completionRate: rate });
    }

    // 5. Recent Activity (Audit logs)
    const recentActivity = await this.prisma.auditLog.findMany({
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 6. Notification History
    const notificationHistory = await this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      kpis: {
        totalUsers,
        activeUsers,
        usersCompletedToday: completedToday,
        usersPendingToday: pendingToday,
        completionPercentage,
      },
      charts: {
        dailyTrend,
        weeklyTrend,
      },
      tables: {
        incompleteUsers: incompleteUsersList,
        recentActivity,
        notificationHistory,
      },
    };
  }

  async getUserDashboard(userId: string, todayStr: string) {
    const assigned = await this.checklistsService.findAssignedForToday(userId, todayStr);
    const total = assigned.length;
    const completed = assigned.filter((a) => a.isCompleted).length;
    const pending = total - completed;
    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate Streak
    const streak = await this.calculateUserStreak(userId, todayStr);

    return {
      kpis: {
        completionPercentage,
        completedTasks: completed,
        pendingTasks: pending,
        currentStreak: streak,
      },
      checklist: assigned,
    };
  }

  async calculateUserStreak(userId: string, todayStr: string): Promise<number> {
    let streak = 0;
    const current = new Date(todayStr);

    // Helper function to check if user completed their checklist on a given date string
    const checkDayCompleted = async (dateVal: string): Promise<boolean> => {
      const assigned = await this.checklistsService.findAssignedForToday(userId, dateVal);
      if (assigned.length === 0) return true; // Treat days with no assignments as neutral (doesn't increment streak, but doesn't break it)
      return assigned.every((a) => a.isCompleted);
    };

    // First check today
    const completedToday = await checkDayCompleted(todayStr);
    let checkDate = new Date(current);

    if (completedToday) {
      // Streak includes today, start scanning backwards from yesterday
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Today is not completed yet. Check if yesterday was completed.
      // If yesterday was completed, the streak is still alive (based on yesterday).
      // If yesterday was not completed, the streak is 0.
      checkDate.setDate(checkDate.getDate() - 1);
      const completedYesterday = await checkDayCompleted(this.formatDate(checkDate));
      if (!completedYesterday) {
        return 0;
      }
      streak = 0; // We will start counting from yesterday
    }

    // Scan backwards
    while (true) {
      const dateStr = this.formatDate(checkDate);
      const assigned = await this.checklistsService.findAssignedForToday(userId, dateStr);

      if (assigned.length > 0) {
        const completedAll = assigned.every((a) => a.isCompleted);
        if (completedAll) {
          streak++;
        } else {
          break; // Streak broken!
        }
      }
      // If assigned.length is 0, it was a neutral day, continue scanning backwards without increasing streak

      // Safety check to avoid infinite loops (max 365 days)
      if (streak > 365) break;

      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }

  async getDailyReport(dateStr: string) {
    const users = await this.prisma.user.findMany({
      where: { role: Role.USER, status: UserStatus.ACTIVE },
      select: { id: true, name: true, email: true },
    });

    const report = [];

    for (const user of users) {
      const assigned = await this.checklistsService.findAssignedForToday(user.id, dateStr);
      const total = assigned.length;
      const completed = assigned.filter((a) => a.isCompleted).length;
      const pending = total - completed;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      report.push({
        userId: user.id,
        name: user.name,
        email: user.email,
        totalTasks: total,
        completedTasks: completed,
        pendingTasks: pending,
        completionRate: pct,
      });
    }

    return report;
  }

  async getWeeklyReport() {
    const users = await this.prisma.user.findMany({
      where: { role: Role.USER, status: UserStatus.ACTIVE },
      select: { id: true, name: true, email: true },
    });

    const last7Days = this.getPastDates(7);
    const report = [];

    for (const user of users) {
      let total = 0;
      let completed = 0;
      const dailyCompletion: Record<string, boolean> = {};

      for (const d of last7Days) {
        const assigned = await this.checklistsService.findAssignedForToday(user.id, d);
        const dayTotal = assigned.length;
        const dayCompleted = assigned.filter((a) => a.isCompleted).length;

        total += dayTotal;
        completed += dayCompleted;
        dailyCompletion[d] = dayTotal > 0 ? dayCompleted === dayTotal : true; // true if no tasks
      }

      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      report.push({
        userId: user.id,
        name: user.name,
        email: user.email,
        totalTasks: total,
        completedTasks: completed,
        completionRate: pct,
        dailyDetails: dailyCompletion,
      });
    }

    return {
      dates: last7Days,
      usersReport: report,
    };
  }

  async getMonthlyReport() {
    const users = await this.prisma.user.findMany({
      where: { role: Role.USER, status: UserStatus.ACTIVE },
      select: { id: true, name: true, email: true },
    });

    const last30Days = this.getPastDates(30);
    const report = [];

    for (const user of users) {
      let total = 0;
      let completed = 0;

      for (const d of last30Days) {
        const assigned = await this.checklistsService.findAssignedForToday(user.id, d);
        total += assigned.length;
        completed += assigned.filter((a) => a.isCompleted).length;
      }

      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      report.push({
        userId: user.id,
        name: user.name,
        email: user.email,
        totalTasks: total,
        completedTasks: completed,
        completionRate: pct,
      });
    }

    // Sort by completion rate
    const sorted = [...report].sort((a, b) => b.completionRate - a.completionRate);
    const topPerformers = sorted.slice(0, 5);
    const lowestPerformers = sorted.slice(-5).reverse();

    return {
      allUsers: report,
      topPerformers,
      lowestPerformers,
    };
  }

  // Simple CSV generation helper
  generateCsv(headers: string[], rows: any[][]): string {
    const escape = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = headers.map(escape).join(',');
    const rowLines = rows.map((row) => row.map(escape).join(','));
    return [headerLine, ...rowLines].join('\n');
  }

  // Excel generation using exceljs
  async generateExcelWorkbook(reportType: string, data: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`${reportType.toUpperCase()} Report`);

    if (reportType === 'daily') {
      sheet.columns = [
        { header: 'User Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Total Assigned Tasks', key: 'total', width: 20 },
        { header: 'Completed Tasks', key: 'completed', width: 20 },
        { header: 'Pending Tasks', key: 'pending', width: 20 },
        { header: 'Completion %', key: 'rate', width: 15 },
      ];

      for (const row of data) {
        sheet.addRow({
          name: row.name,
          email: row.email,
          total: row.totalTasks,
          completed: row.completedTasks,
          pending: row.pendingTasks,
          rate: `${row.completionRate}%`,
        });
      }
    } else if (reportType === 'weekly') {
      const dates = data.dates as string[];
      const columns = [
        { header: 'User Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Total Tasks', key: 'total', width: 15 },
        { header: 'Completed', key: 'completed', width: 15 },
        { header: 'Avg Rate %', key: 'rate', width: 15 },
      ];

      // Add a column for each date
      for (const d of dates) {
        columns.push({ header: d, key: d, width: 15 });
      }
      sheet.columns = columns;

      for (const row of data.usersReport) {
        const rowData: any = {
          name: row.name,
          email: row.email,
          total: row.totalTasks,
          completed: row.completedTasks,
          rate: `${row.completionRate}%`,
        };
        for (const d of dates) {
          rowData[d] = row.dailyDetails[d] ? 'COMPLETED' : 'INCOMPLETE';
        }
        sheet.addRow(rowData);
      }
    } else if (reportType === 'monthly') {
      sheet.columns = [
        { header: 'User Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: '30-Day Total Tasks', key: 'total', width: 20 },
        { header: '30-Day Completed Tasks', key: 'completed', width: 20 },
        { header: '30-Day Completion %', key: 'rate', width: 20 },
      ];

      for (const row of data.allUsers) {
        sheet.addRow({
          name: row.name,
          email: row.email,
          total: row.totalTasks,
          completed: row.completedTasks,
          rate: `${row.completionRate}%`,
        });
      }
    }

    // Apply header styles
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEAEAEA' },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
