import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FreelancerService {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: string) {
    const profile = await this.prisma.freelancerProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!profile) {
      throw new NotFoundException(`Freelancer profile for user ID ${userId} not found`);
    }

    return profile;
  }

  async upsertProfile(
    userId: string,
    data: {
      title: string;
      bio: string;
      skills: string[];
      hourlyRate: number;
      githubUrl?: string;
      portfolio?: any;
      experience?: any;
      certificates?: any;
      resumeUrl?: string;
    },
  ) {
    return this.prisma.freelancerProfile.upsert({
      where: { userId },
      update: {
        title: data.title,
        bio: data.bio,
        skills: data.skills,
        hourlyRate: data.hourlyRate,
        githubUrl: data.githubUrl,
        portfolio: data.portfolio,
        experience: data.experience,
        certificates: data.certificates,
        resumeUrl: data.resumeUrl,
      },
      create: {
        userId,
        title: data.title,
        bio: data.bio,
        skills: data.skills,
        hourlyRate: data.hourlyRate,
        githubUrl: data.githubUrl,
        portfolio: data.portfolio,
        experience: data.experience,
        certificates: data.certificates,
        resumeUrl: data.resumeUrl,
      },
    });
  }

  async listFreelancers(filters?: { skill?: string; maxRate?: number }) {
    const whereClause: any = {};

    if (filters?.skill) {
      whereClause.skills = {
        has: filters.skill,
      };
    }

    if (filters?.maxRate) {
      whereClause.hourlyRate = {
        lte: filters.maxRate,
      };
    }

    return this.prisma.freelancerProfile.findMany({
      where: whereClause,
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
