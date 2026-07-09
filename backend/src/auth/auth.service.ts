import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { generateNonce, SiweMessage } from 'siwe';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwtService: JwtService,
  ) {}

  // Standard Email/Password Signup
  async signup(email: string, username: string, passwordHashRaw: string, role: Role) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or username is already registered');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(passwordHashRaw, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role,
      },
    });

    return this.generateTokenResponse(user);
  }

  // Standard Email/Password Signin
  async signin(email: string, passwordHashRaw: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(passwordHashRaw, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokenResponse(user);
  }

  // SIWE Nonce Generator
  async generateSiweNonce(): Promise<string> {
    const nonce = generateNonce();
    // Cache the nonce in Redis for 5 minutes
    await this.redis.set(`siwe:nonce:${nonce}`, 'true', 300);
    return nonce;
  }

  // SIWE Message Verification
  async verifySiweMessage(message: string, signature: string) {
    try {
      const siweMessage = new SiweMessage(message);
      
      // Verify signature
      const verification = await siweMessage.verify({ signature });
      
      if (!verification.success) {
        throw new BadRequestException('SIWE message verification failed');
      }

      // Check nonce exists in Redis to prevent replay attacks
      const nonceKey = `siwe:nonce:${siweMessage.nonce}`;
      const nonceExists = await this.redis.get(nonceKey);
      if (!nonceExists) {
        throw new BadRequestException('SIWE nonce is invalid or expired');
      }
      
      // Consume the nonce
      await this.redis.del(nonceKey);

      const walletAddress = siweMessage.address.toLowerCase();

      // Find or create User linked to this wallet address
      let user = await this.prisma.user.findUnique({
        where: { walletAddress },
      });

      if (!user) {
        // Create user with default role and random username derived from address
        user = await this.prisma.user.create({
          data: {
            email: `${walletAddress}@marketplace.siwe`,
            username: `user_${walletAddress.slice(0, 10)}`,
            walletAddress,
            role: Role.FREELANCER, // Default fallback role, user can choose/modify role in profile page later
          },
        });
      }

      return this.generateTokenResponse(user);
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Signature validation failed');
    }
  }

  private generateTokenResponse(user: { id: string; email: string; role: Role }) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
