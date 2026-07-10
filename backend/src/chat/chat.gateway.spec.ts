import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let jwt: JwtService;

  const mockJwt = {
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    jwt = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should disconnect client if no token provided', async () => {
      const mockSocket = {
        handshake: {
          auth: {},
          headers: {},
        },
        disconnect: jest.fn(),
      } as unknown as Socket;

      await gateway.handleConnection(mockSocket);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should authenticate client if valid token provided', async () => {
      const mockSocket = {
        handshake: {
          auth: { token: 'valid-token' },
        },
        data: {},
      } as unknown as Socket;

      mockJwt.verify.mockReturnValue({ sub: 'user-123', role: 'CLIENT' });

      await gateway.handleConnection(mockSocket);
      expect(mockSocket.data).toEqual({ userId: 'user-123', role: 'CLIENT' });
    });
  });

  describe('handleJoinRoom', () => {
    it('should make client join specified room', () => {
      const mockSocket = {
        id: 'socket-id',
        join: jest.fn(),
      } as unknown as Socket;

      gateway.handleJoinRoom(mockSocket, 'chat-room-1');
      expect(mockSocket.join).toHaveBeenCalledWith('chat-room-1');
    });
  });

  describe('handleTyping', () => {
    it('should broadcast typing status to room', () => {
      const mockSocket = {
        data: { userId: 'user-123' },
        to: jest.fn().mockReturnValue({
          emit: jest.fn(),
        }),
      } as unknown as Socket;

      gateway.handleTyping(mockSocket, { roomId: 'room-1', isTyping: true });
      expect(mockSocket.to).toHaveBeenCalledWith('room-1');
    });
  });
});
