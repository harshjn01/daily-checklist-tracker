import { Controller, Get, Put, Param, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(@Request() req: any) {
    return this.notificationsService.findAllForUser(req.user.id);
  }

  @Put('read-all')
  async markAllRead(@Request() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Put(':id/read')
  async markRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }
}
