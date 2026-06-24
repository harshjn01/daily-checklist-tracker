import { Controller, Get, Query, UseGuards, Request, Param, Res, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../types/enums';
import { Response } from 'express';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard/admin')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getAdminDashboard(@Query('date') queryDate?: string) {
    const todayStr = queryDate || new Date().toISOString().split('T')[0];
    return this.reportsService.getAdminDashboard(todayStr);
  }

  @Get('dashboard/user')
  async getUserDashboard(@Request() req: any, @Query('userId') queryUserId?: string, @Query('date') queryDate?: string) {
    let targetUserId = req.user.id;
    if (req.user.role === Role.ADMIN && queryUserId) {
      targetUserId = queryUserId;
    }
    const todayStr = queryDate || new Date().toISOString().split('T')[0];
    return this.reportsService.getUserDashboard(targetUserId, todayStr);
  }

  @Get('daily')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getDailyReport(@Query('date') queryDate?: string) {
    const dateStr = queryDate || new Date().toISOString().split('T')[0];
    return this.reportsService.getDailyReport(dateStr);
  }

  @Get('weekly')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getWeeklyReport() {
    return this.reportsService.getWeeklyReport();
  }

  @Get('monthly')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getMonthlyReport() {
    return this.reportsService.getMonthlyReport();
  }

  @Get('export/:type')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async exportReport(
    @Param('type') type: string, // daily, weekly, monthly
    @Res() res: Response,
    @Query('format') format: string = 'csv', // csv, excel
    @Query('date') queryDate?: string,
  ) {
    const dateStr = queryDate || new Date().toISOString().split('T')[0];
    let data: any;

    if (type === 'daily') {
      data = await this.reportsService.getDailyReport(dateStr);
    } else if (type === 'weekly') {
      data = await this.reportsService.getWeeklyReport();
    } else if (type === 'monthly') {
      data = await this.reportsService.getMonthlyReport();
    } else {
      throw new BadRequestException('Invalid report type. Use daily, weekly, or monthly.');
    }

    if (format === 'excel') {
      const buffer = await this.reportsService.generateExcelWorkbook(type, data);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-report-${dateStr}.xlsx`);
      return res.send(buffer);
    } else {
      // Default: CSV
      let csvContent = '';
      if (type === 'daily') {
        const headers = ['User Name', 'Email', 'Total Assigned Tasks', 'Completed Tasks', 'Pending Tasks', 'Completion %'];
        const rows = data.map((r: any) => [r.name, r.email, r.totalTasks, r.completedTasks, r.pendingTasks, r.completionRate]);
        csvContent = this.reportsService.generateCsv(headers, rows);
      } else if (type === 'weekly') {
        const dates = data.dates as string[];
        const headers = ['User Name', 'Email', 'Total Tasks', 'Completed Tasks', 'Completion %', ...dates];
        const rows = data.usersReport.map((r: any) => [
          r.name,
          r.email,
          r.totalTasks,
          r.completedTasks,
          r.completionRate,
          ...dates.map((d) => (r.dailyDetails[d] ? 'COMPLETED' : 'INCOMPLETE')),
        ]);
        csvContent = this.reportsService.generateCsv(headers, rows);
      } else if (type === 'monthly') {
        const headers = ['User Name', 'Email', 'Total Tasks', 'Completed Tasks', 'Completion %'];
        const rows = data.allUsers.map((r: any) => [r.name, r.email, r.totalTasks, r.completedTasks, r.completionRate]);
        csvContent = this.reportsService.generateCsv(headers, rows);
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-report-${dateStr}.csv`);
      return res.send(csvContent);
    }
  }
}
