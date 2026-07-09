import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContractStatus, MilestoneStatus, JobStatus } from '@prisma/client';

@Injectable()
export class ContractService {
  constructor(private prisma: PrismaService) {}

  // Initialize contract and milestones when proposal accepted & funded
  async createContract(
    clientId: string,
    data: {
      jobId: string;
      freelancerId: string;
      totalBudget: number;
      escrowAddress: string;
      chainId: number;
      tokenAddress?: string;
      milestones: { title: string; description: string; budget: number; index: number }[];
    },
  ) {
    // Start transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Update job status to IN_PROGRESS
      await tx.job.update({
        where: { id: data.jobId },
        data: {
          status: JobStatus.IN_PROGRESS,
          escrowAddress: data.escrowAddress,
          chainId: data.chainId,
          tokenAddress: data.tokenAddress,
        },
      });

      // 2. Create the Contract record
      const contract = await tx.contract.create({
        data: {
          jobId: data.jobId,
          clientId,
          freelancerId: data.freelancerId,
          totalBudget: data.totalBudget,
          escrowAddress: data.escrowAddress,
          chainId: data.chainId,
          tokenAddress: data.tokenAddress,
          status: ContractStatus.ACTIVE,
        },
      });

      // 3. Create the Milestones
      const milestonePromises = data.milestones.map((m) =>
        tx.milestone.create({
          data: {
            contractId: contract.id,
            index: m.index,
            title: m.title,
            description: m.description,
            budget: m.budget,
            status: MilestoneStatus.PENDING,
          },
        }),
      );
      await Promise.all(milestonePromises);

      return tx.contract.findUnique({
        where: { id: contract.id },
        include: { milestones: true },
      });
    });
  }

  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        job: true,
        client: { select: { username: true, walletAddress: true } },
        freelancer: { select: { username: true, walletAddress: true } },
        milestones: { orderBy: { index: 'asc' } },
        dispute: true,
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }

    return contract;
  }

  // Sync state transitions (often triggered by event listener or direct client requests)
  async fundMilestone(contractId: string, index: number) {
    const milestone = await this.findMilestone(contractId, index);
    return this.prisma.milestone.update({
      where: { id: milestone.id },
      data: { status: MilestoneStatus.FUNDED },
    });
  }

  async submitWork(contractId: string, index: number, submissionIpfsHash: string, freelancerId: string) {
    const contract = await this.findOne(contractId);
    if (contract.freelancerId !== freelancerId) {
      throw new ForbiddenException('Only the assigned freelancer can submit work');
    }

    const milestone = await this.findMilestone(contractId, index);
    if (milestone.status !== MilestoneStatus.FUNDED && milestone.status !== MilestoneStatus.REJECTED) {
      throw new BadRequestException('Milestone is not funded or ready for submission');
    }

    return this.prisma.milestone.update({
      where: { id: milestone.id },
      data: {
        status: MilestoneStatus.SUBMITTED,
        submissionIpfsHash,
      },
    });
  }

  async approveMilestone(contractId: string, index: number, clientId: string) {
    const contract = await this.findOne(contractId);
    if (contract.clientId !== clientId) {
      throw new ForbiddenException('Only the client can approve work');
    }

    const milestone = await this.findMilestone(contractId, index);
    if (milestone.status !== MilestoneStatus.SUBMITTED) {
      throw new BadRequestException('Milestone is not submitted for approval');
    }

    // Start transaction to approve milestone and check if contract is fully complete
    return this.prisma.$transaction(async (tx) => {
      const updatedMilestone = await tx.milestone.update({
        where: { id: milestone.id },
        data: { status: MilestoneStatus.APPROVED },
      });

      // Fetch all milestones for this contract to check if all are approved
      const allMilestones = await tx.milestone.findMany({
        where: { contractId },
      });

      const allApproved = allMilestones.every((m) => m.status === MilestoneStatus.APPROVED);
      if (allApproved) {
        // Complete the contract
        await tx.contract.update({
          where: { id: contractId },
          data: { status: ContractStatus.COMPLETED },
        });

        // Also mark the Job as completed
        await tx.job.update({
          where: { id: contract.jobId },
          data: { status: JobStatus.COMPLETED },
        });
      }

      return updatedMilestone;
    });
  }

  async rejectMilestone(contractId: string, index: number, feedback: string, clientId: string) {
    const contract = await this.findOne(contractId);
    if (contract.clientId !== clientId) {
      throw new ForbiddenException('Only the client can reject work');
    }

    const milestone = await this.findMilestone(contractId, index);
    if (milestone.status !== MilestoneStatus.SUBMITTED) {
      throw new BadRequestException('Milestone is not submitted for review');
    }

    return this.prisma.milestone.update({
      where: { id: milestone.id },
      data: {
        status: MilestoneStatus.REJECTED,
        feedback,
      },
    });
  }

  async listUserContracts(userId: string) {
    return this.prisma.contract.findMany({
      where: {
        OR: [{ clientId: userId }, { freelancerId: userId }],
      },
      include: {
        job: true,
        milestones: true,
      },
    });
  }

  private async findMilestone(contractId: string, index: number) {
    const milestone = await this.prisma.milestone.findFirst({
      where: { contractId, index },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with index ${index} under contract ID ${contractId} not found`);
    }

    return milestone;
  }
}
