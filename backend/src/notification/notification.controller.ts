import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(@CurrentUser() user: any) {
    return this.notificationService.getNotifications(user.id);
  }

  @Post(':id/read')
  async markRead(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationService.markAsRead(id, user.id);
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() user: any) {
    return this.notificationService.markAllAsRead(user.id);
  }
}
