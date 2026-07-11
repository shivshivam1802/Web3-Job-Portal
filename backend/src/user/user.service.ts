import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, KycStatus } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        freelancerProfile: true,
        clientProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async updateProfile(id: string, data: { email?: string; username?: string; walletAddress?: string; role?: Role }) {
    // Check uniqueness if email or username is changing
    if (data.email) {
      const emailExists = await this.prisma.user.findFirst({
        where: { email: data.email, NOT: { id } },
      });
      if (emailExists) {
        throw new BadRequestException('Email is already in use');
      }
    }

    if (data.username) {
      const usernameExists = await this.prisma.user.findFirst({
        where: { username: data.username, NOT: { id } },
      });
      if (usernameExists) {
        throw new BadRequestException('Username is already in use');
      }
    }

    if (data.walletAddress) {
      const walletExists = await this.prisma.user.findFirst({
        where: { walletAddress: data.walletAddress.toLowerCase(), NOT: { id } },
      });
      if (walletExists) {
        throw new BadRequestException('Wallet address is already in use');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        username: data.username,
        walletAddress: data.walletAddress ? data.walletAddress.toLowerCase() : undefined,
        role: data.role,
      },
    });
  }

  async updateKycStatus(id: string, kycStatus: KycStatus) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { kycStatus },
    });
  }

  async configure2FA(id: string, is2FAEnabled: boolean, twoFactorSecret?: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        is2FAEnabled,
        twoFactorSecret: is2FAEnabled ? twoFactorSecret : null,
      },
    });
  }

  async listAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        walletAddress: true,
        role: true,
        kycStatus: true,
        createdAt: true,
      },
    });
  }
}
