import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private activeConnections = new Map<string, string>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }

      const secret = process.env.JWT_SECRET || 'fallback-super-secret-key-123';
      const payload = this.jwtService.verify(token, { secret });
      
      client.data = { userId: payload.sub, role: payload.role };
      this.activeConnections.set(payload.sub, client.id);

      console.log(`WebSocket Client Connected: ${client.id} (User: ${payload.sub})`);
    } catch (err) {
      console.log('WebSocket Authentication failed, disconnecting client...');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data?.userId) {
      this.activeConnections.delete(client.data.userId);
      console.log(`WebSocket Client Disconnected: ${client.id} (User: ${client.data.userId})`);
    }
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(client: Socket, room: string) {
    client.join(room);
    console.log(`Client ${client.id} joined room: ${room}`);
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(client: Socket, room: string) {
    client.leave(room);
    console.log(`Client ${client.id} left room: ${room}`);
  }

  @SubscribeMessage('typing')
  handleTyping(client: Socket, payload: { roomId: string; isTyping: boolean }) {
    client.to(payload.roomId).emit('typing_status', {
      userId: client.data.userId,
      isTyping: payload.isTyping,
    });
  }

  sendRealTimeMessage(roomId: string, event: string, messagePayload: any) {
    this.server.to(roomId).emit(event, messagePayload);
  }

  sendDirectNotification(userId: string, event: string, notificationPayload: any) {
    const socketId = this.activeConnections.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, notificationPayload);
    }
  }
}
