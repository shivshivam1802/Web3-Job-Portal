import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async saveMessage(senderId: string, recipientId: string, content: string) {
    return this.prisma.message.create({
      data: {
        senderId,
        recipientId,
        content,
        isRead: false,
      },
      include: {
        sender: { select: { id: true, username: true } },
        recipient: { select: { id: true, username: true } },
      },
    });
  }

  async getChatHistory(userId: string, contactId: string) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: contactId },
          { senderId: contactId, recipientId: userId },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async markAsRead(userId: string, contactId: string) {
    await this.prisma.message.updateMany({
      where: {
        senderId: contactId,
        recipientId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
    return { success: true };
  }

  // Get active user threads (distinct contacts messaged with)
  async getChatThreads(userId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const threadMap = new Map<string, any>();

    for (const msg of messages) {
      const contactId = msg.senderId === userId ? msg.recipientId : msg.senderId;
      if (!threadMap.has(contactId)) {
        threadMap.set(contactId, {
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          isRead: msg.recipientId === userId ? msg.isRead : true,
        });
      }
    }

    const threads: any[] = [];
    for (const [contactId, details] of threadMap.entries()) {
      const contactUser = await this.prisma.user.findUnique({
        where: { id: contactId },
        select: { id: true, username: true, role: true },
      });
      if (contactUser) {
        threads.push({
          contact: contactUser,
          ...details,
        });
      }
    }

    return threads;
  }
}
