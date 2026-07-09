import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProposalStatus, Role } from '@prisma/client';

@Injectable()
export class ProposalService {
  constructor(private prisma: PrismaService) {}

  async submitProposal(
    freelancerId: string,
    userRole: Role,
    data: {
      jobId: string;
      bidAmount: number;
      deliveryDays: number;
      coverLetter: string;
      attachments: string[];
    },
  ) {
    if (userRole !== Role.FREELANCER && userRole !== Role.ADMIN) {
      throw new ForbiddenException('Only freelancers can submit proposals');
    }

    // Verify job exists
    const job = await this.prisma.job.findUnique({
      where: { id: data.jobId },
    });
    if (!job) {
      throw new NotFoundException(`Job with ID ${data.jobId} not found`);
    }

    // Verify freelancer hasn't already submitted a proposal
    const existing = await this.prisma.proposal.findFirst({
      where: {
        jobId: data.jobId,
        freelancerId,
      },
    });
    if (existing) {
      throw new BadRequestException('You have already applied to this job posting');
    }

    return this.prisma.proposal.create({
      data: {
        jobId: data.jobId,
        freelancerId,
        bidAmount: data.bidAmount,
        deliveryDays: data.deliveryDays,
        coverLetter: data.coverLetter,
        attachments: data.attachments,
        status: ProposalStatus.PENDING,
      },
    });
  }

  async findOne(id: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: {
        job: true,
        freelancer: {
          select: {
            username: true,
            email: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${id} not found`);
    }

    return proposal;
  }

  async updateProposal(
    id: string,
    freelancerId: string,
    data: {
      bidAmount?: number;
      deliveryDays?: number;
      coverLetter?: string;
      attachments?: string[];
    },
  ) {
    const proposal = await this.findOne(id);
    if (proposal.freelancerId !== freelancerId) {
      throw new ForbiddenException('You do not own this proposal');
    }

    if (proposal.status !== ProposalStatus.PENDING) {
      throw new BadRequestException('Can only update pending proposals');
    }

    return this.prisma.proposal.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: string, clientId: string, status: ProposalStatus) {
    const proposal = await this.findOne(id);
    if (proposal.job.clientId !== clientId) {
      throw new ForbiddenException('You are not the client for this job');
    }

    return this.prisma.proposal.update({
      where: { id },
      data: { status },
    });
  }

  async getProposalsForJob(jobId: string, userId: string, role: Role) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // If client, return all proposals for this job
    if (job.clientId === userId || role === Role.ADMIN) {
      return this.prisma.proposal.findMany({
        where: { jobId },
        include: {
          freelancer: {
            select: {
              username: true,
              walletAddress: true,
              freelancerProfile: true,
            },
          },
        },
      });
    }

    // If freelancer, return only their own proposal
    return this.prisma.proposal.findMany({
      where: {
        jobId,
        freelancerId: userId,
      },
    });
  }
}
