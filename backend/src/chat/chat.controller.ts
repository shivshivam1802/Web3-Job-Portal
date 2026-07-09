import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('threads')
  async getThreads(@CurrentUser() user: any) {
    return this.chatService.getChatThreads(user.id);
  }

  @Get('history/:contactId')
  async getHistory(
    @Param('contactId') contactId: string,
    @CurrentUser() user: any,
  ) {
    return this.chatService.getChatHistory(user.id, contactId);
  }

  @Post('read/:contactId')
  async markRead(
    @Param('contactId') contactId: string,
    @CurrentUser() user: any,
  ) {
    return this.chatService.markAsRead(user.id, contactId);
  }

  @Post('send')
  async sendMessage(
    @CurrentUser() user: any,
    @Body('recipientId') recipientId: string,
    @Body('content') content: string,
  ) {
    return this.chatService.saveMessage(user.id, recipientId, content);
  }
}
