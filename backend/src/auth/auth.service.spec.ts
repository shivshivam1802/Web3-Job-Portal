import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signin', () => {
    it('should return user and token if credentials match', async () => {
      const plainPassword = 'password123';
      const hashedPassword = await bcrypt.hash(plainPassword, 1);
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: hashedPassword,
        role: Role.CLIENT,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.signin('test@example.com', plainPassword);
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.id).toBe('user-id');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.signin('none@example.com', 'pass'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('realpass', 1);
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: hashedPassword,
        role: Role.CLIENT,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.signin('test@example.com', 'wrongpass'))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('signup', () => {
    it('should register a new user and return tokens', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null); // Unique check
      const mockCreated = {
        id: 'new-id',
        email: 'new@example.com',
        username: 'newuser',
        role: Role.FREELANCER,
      };
      mockPrisma.user.create.mockResolvedValue(mockCreated);

      const result = await service.signup('new@example.com', 'newuser', 'password123', Role.FREELANCER);
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.id).toBe('new-id');
    });

    it('should throw ConflictException if email/username already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing-id' });

      await expect(service.signup('new@example.com', 'newuser', 'password123', Role.FREELANCER))
        .rejects.toThrow(ConflictException);
    });
  });
});
