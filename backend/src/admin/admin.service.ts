import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, JobStatus, DisputeStatus, KycStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // Helper check for admin role
  private checkAdmin(role: Role) {
    if (role !== Role.ADMIN) {
      throw new ForbiddenException('Access denied. Admin role required.');
    }
  }

  async getUsers(adminRole: Role, page = 1, limit = 10) {
    this.checkAdmin(adminRole);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          freelancerProfile: true,
          clientProfile: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users,
      total,
      page,
      limit,
    };
  }

  async moderateJob(adminRole: Role, jobId: string, status: JobStatus) {
    this.checkAdmin(adminRole);

    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    return this.prisma.job.update({
      where: { id: jobId },
      data: { status },
    });
  }

  async blacklistUser(adminRole: Role, userId: string) {
    this.checkAdmin(adminRole);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Set KYC status to REJECTED or disable/deactivate user (e.g. modify username/email or flag)
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: KycStatus.REJECTED,
      },
    });
  }

  async getOpenDisputes(adminRole: Role) {
    this.checkAdmin(adminRole);

    return this.prisma.dispute.findMany({
      where: { status: DisputeStatus.OPEN },
      include: {
        contract: {
          include: {
            job: true,
            client: { select: { username: true, walletAddress: true } },
            freelancer: { select: { username: true, walletAddress: true } },
          },
        },
      },
    });
  }

  async resolveDispute(
    adminRole: Role,
    disputeId: string,
    freelancerShare: number,
    clientShare: number,
  ) {
    this.checkAdmin(adminRole);

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { contract: true },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve the dispute
      const updatedDispute = await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status: DisputeStatus.RESOLVED,
          freelancerProposedRelease: freelancerShare,
          clientProposedRefund: clientShare,
          resolvedAt: new Date(),
        },
      });

      // 2. Set contract as completed
      await tx.contract.update({
        where: { id: dispute.contractId },
        data: {
          status: 'COMPLETED',
        },
      });

      return updatedDispute;
    });
  }
}
