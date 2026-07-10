import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
  ) {}

  async createNotification(
    userId: string,
    data: {
      title: string;
      message: string;
      type: NotificationType;
    },
  ) {
    // 1. Save to Database
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title: data.title,
        message: data.message,
        type: data.type,
      },
    });

    // 2. Real-time Push via WebSocket Gateway
    try {
      this.chatGateway.sendDirectNotification(userId, 'notification', notification);
      console.log(`Pushed real-time notification to user ${userId}: ${data.title}`);
    } catch (wsError) {
      console.warn(`Failed to push WebSockets notification: ${wsError}`);
    }

    // 3. Email Channel Push (Mocked)
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && user.email) {
      console.log(`[MOCK EMAIL CHANNEL] Sending email alert to ${user.email} - Subject: ${data.title}`);
    }

    return notification;
  }

  async getNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    if (notification.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }
}
