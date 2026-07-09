import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientService } from '../client/client.service';
import { PaymentType } from '@prisma/client';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private clientService: ClientService,
  ) {}

  async logPayment(data: {
    contractId: string;
    sender: string;
    recipient: string;
    amount: number;
    tokenAddress?: string;
    txHash: string;
    type: PaymentType;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create the Payment Audit log
      const payment = await tx.payment.create({
        data: {
          contractId: data.contractId,
          sender: data.sender.toLowerCase(),
          recipient: data.recipient.toLowerCase(),
          amount: data.amount,
          tokenAddress: data.tokenAddress,
          txHash: data.txHash.toLowerCase(),
          type: data.type,
        },
      });

      // 2. If it is a RELEASE or DISPUTE_SPLIT (paying the freelancer), update client totalSpent
      if (data.type === PaymentType.RELEASE || data.type === PaymentType.DISPUTE_SPLIT) {
        const contract = await tx.contract.findUnique({
          where: { id: data.contractId },
        });
        if (contract) {
          await tx.clientProfile.update({
            where: { userId: contract.clientId },
            data: {
              totalSpent: {
                increment: data.amount,
              },
            },
          });
        }
      }

      return payment;
    });
  }

  async getContractPayments(contractId: string) {
    return this.prisma.payment.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserPayments(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const walletAddress = user.walletAddress ? user.walletAddress.toLowerCase() : '';

    return this.prisma.payment.findMany({
      where: {
        OR: [
          { sender: walletAddress },
          { recipient: walletAddress },
        ],
      },
      include: {
        contract: {
          include: {
            job: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
