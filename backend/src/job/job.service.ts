import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatus, Role } from '@prisma/client';

@Injectable()
export class JobService {
  constructor(private prisma: PrismaService) {}

  async create(
    clientId: string,
    userRole: Role,
    data: {
      title: string;
      description: string;
      category: string;
      tags: string[];
      budget: number;
      isMilestoneBased?: boolean;
      tokenAddress?: string;
      chainId?: number;
    },
  ) {
    if (userRole !== Role.CLIENT && userRole !== Role.ADMIN) {
      throw new ForbiddenException('Only clients can post jobs');
    }

    return this.prisma.job.create({
      data: {
        clientId,
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags,
        budget: data.budget,
        isMilestoneBased: data.isMilestoneBased ?? true,
        tokenAddress: data.tokenAddress,
        chainId: data.chainId,
        status: JobStatus.OPEN,
      },
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        proposals: {
          include: {
            freelancer: {
              select: {
                username: true,
                walletAddress: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return job;
  }

  async update(
    id: string,
    clientId: string,
    data: {
      title?: string;
      description?: string;
      category?: string;
      tags?: string[];
      budget?: number;
      status?: JobStatus;
    },
  ) {
    const job = await this.findOne(id);

    if (job.clientId !== clientId) {
      throw new ForbiddenException('You do not own this job posting');
    }

    return this.prisma.job.update({
      where: { id },
      data: {
        ...data,
      },
    });
  }

  async remove(id: string, clientId: string) {
    const job = await this.findOne(id);

    if (job.clientId !== clientId) {
      throw new ForbiddenException('You do not own this job posting');
    }

    return this.prisma.job.update({
      where: { id },
      data: {
        status: JobStatus.CANCELLED,
      },
    });
  }

  async listJobs() {
    return this.prisma.job.findMany({
      where: {
        status: JobStatus.OPEN,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
