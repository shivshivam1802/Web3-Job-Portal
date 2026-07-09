import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: string) {
    const profile = await this.prisma.clientProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!profile) {
      throw new NotFoundException(`Client profile for user ID ${userId} not found`);
    }

    return profile;
  }

  async upsertProfile(
    userId: string,
    data: {
      companyName?: string;
      companyWebsite?: string;
      location?: string;
      bio?: string;
    },
  ) {
    return this.prisma.clientProfile.upsert({
      where: { userId },
      update: {
        companyName: data.companyName,
        companyWebsite: data.companyWebsite,
        location: data.location,
        bio: data.bio,
      },
      create: {
        userId,
        companyName: data.companyName,
        companyWebsite: data.companyWebsite,
        location: data.location,
        bio: data.bio,
        isVerified: false,
        totalSpent: 0,
      },
    });
  }

  async incrementSpent(userId: string, amount: number) {
    const profile = await this.findByUserId(userId);
    return this.prisma.clientProfile.update({
      where: { userId },
      data: {
        totalSpent: {
          increment: amount,
        },
      },
    });
  }

  async listClients() {
    return this.prisma.clientProfile.findMany({
      include: {
        user: {
          select: {
            username: true,
            email: true,
            walletAddress: true,
          },
        },
      },
    });
  }
}
