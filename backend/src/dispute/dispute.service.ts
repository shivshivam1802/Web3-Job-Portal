import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DisputeStatus, ContractStatus } from '@prisma/client';

@Injectable()
export class DisputeService {
  constructor(private prisma: PrismaService) {}

  async raiseDispute(
    userId: string,
    data: {
      contractId: string;
      reason: string;
    },
  ) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: data.contractId },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${data.contractId} not found`);
    }

    if (contract.clientId !== userId && contract.freelancerId !== userId) {
      throw new ForbiddenException('Only the client or freelancer of this contract can initiate a dispute');
    }

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException('Dispute can only be raised on active contracts');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update contract status to IN_DISPUTE
      await tx.contract.update({
        where: { id: data.contractId },
        data: { status: ContractStatus.IN_DISPUTE },
      });

      // 2. Create the dispute entry
      return tx.dispute.create({
        data: {
          contractId: data.contractId,
          raisedById: userId,
          reason: data.reason,
          status: DisputeStatus.OPEN,
          evidence: [],
          mediatorVotes: [],
        },
      });
    });
  }

  async findOne(id: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
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

    if (!dispute) {
      throw new NotFoundException(`Dispute with ID ${id} not found`);
    }

    return dispute;
  }

  async submitEvidence(id: string, userId: string, evidenceUrl: string, description: string) {
    const dispute = await this.findOne(id);
    if (dispute.contract.clientId !== userId && dispute.contract.freelancerId !== userId) {
      throw new ForbiddenException('Only contract parties can upload evidence');
    }

    const currentEvidence = (dispute.evidence as any[]) || [];
    const updatedEvidence = [
      ...currentEvidence,
      {
        submittedBy: userId,
        url: evidenceUrl,
        description,
        timestamp: new Date().toISOString(),
      },
    ];

    return this.prisma.dispute.update({
      where: { id },
      data: {
        evidence: updatedEvidence,
      },
    });
  }

  async submitMediatorVote(
    id: string,
    mediatorAddress: string,
    freelancerShare: number,
    clientShare: number,
  ) {
    const dispute = await this.findOne(id);
    if (dispute.status !== DisputeStatus.OPEN) {
      throw new BadRequestException('Dispute is already resolved');
    }

    const currentVotes = (dispute.mediatorVotes as any[]) || [];
    
    // Check if mediator already voted
    const hasVoted = currentVotes.some((v) => v.mediator.toLowerCase() === mediatorAddress.toLowerCase());
    if (hasVoted) {
      throw new BadRequestException('Mediator has already voted on this dispute');
    }

    const updatedVotes = [
      ...currentVotes,
      {
        mediator: mediatorAddress.toLowerCase(),
        freelancerShare,
        clientShare,
        timestamp: new Date().toISOString(),
      },
    ];

    // Compute averages
    const voteCount = updatedVotes.length;
    const totalFreelancerShare = updatedVotes.reduce((sum, v) => sum + v.freelancerShare, 0);
    const totalClientShare = updatedVotes.reduce((sum, v) => sum + v.clientShare, 0);

    const avgFreelancerShare = totalFreelancerShare / voteCount;
    const avgClientShare = totalClientShare / voteCount;

    return this.prisma.dispute.update({
      where: { id },
      data: {
        mediatorVotes: updatedVotes,
        freelancerProposedRelease: avgFreelancerShare,
        clientProposedRefund: avgClientShare,
      },
    });
  }

  async resolveDispute(id: string) {
    const dispute = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const updatedDispute = await tx.dispute.update({
        where: { id },
        data: {
          status: DisputeStatus.RESOLVED,
          resolvedAt: new Date(),
        },
      });

      await tx.contract.update({
        where: { id: dispute.contractId },
        data: { status: ContractStatus.COMPLETED },
      });

      return updatedDispute;
    });
  }

  async approveAdminResolution(
    id: string,
    adminId: string,
    freelancerShare: number,
    clientShare: number,
  ) {
    const dispute = await this.findOne(id);
    if (dispute.status !== DisputeStatus.OPEN) {
      throw new BadRequestException('Dispute is already resolved');
    }

    const currentEvidence = (dispute.evidence as any[]) || [];
    
    const alreadyApproved = currentEvidence.some(
      (item) => item.adminApprovalBy === adminId
    );
    if (alreadyApproved) {
      throw new BadRequestException('You have already approved a resolution split for this dispute');
    }

    const updatedEvidence = [
      ...currentEvidence,
      {
        adminApprovalBy: adminId,
        freelancerShare,
        clientShare,
        timestamp: new Date().toISOString(),
      },
    ];

    const adminApprovals = updatedEvidence.filter((item) => item.adminApprovalBy !== undefined);
    
    if (adminApprovals.length >= 2) {
      return this.prisma.$transaction(async (tx) => {
        const updatedDispute = await tx.dispute.update({
          where: { id },
          data: {
            status: DisputeStatus.RESOLVED,
            freelancerProposedRelease: freelancerShare,
            clientProposedRefund: clientShare,
            resolvedAt: new Date(),
            evidence: updatedEvidence,
          },
        });

        await tx.contract.update({
          where: { id: dispute.contractId },
          data: { status: ContractStatus.COMPLETED },
        });

        return updatedDispute;
      });
    }

    return this.prisma.dispute.update({
      where: { id },
      data: {
        evidence: updatedEvidence,
      },
    });
  }
}
