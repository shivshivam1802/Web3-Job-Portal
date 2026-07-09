import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async submitReview(
    reviewerId: string,
    data: {
      contractId: string;
      ratingOverall: number;
      ratingCommunication: number;
      ratingSkill: number;
      ratingTimeliness: number;
      comment: string;
    },
  ) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: data.contractId },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${data.contractId} not found`);
    }

    // Verify reviewer is part of the contract
    if (contract.clientId !== reviewerId && contract.freelancerId !== reviewerId) {
      throw new ForbiddenException('You were not part of this contract');
    }

    const revieweeId = contract.clientId === reviewerId ? contract.freelancerId : contract.clientId;

    // Verify duplicate reviews
    const existing = await this.prisma.review.findFirst({
      where: {
        contractId: data.contractId,
        reviewerId,
      },
    });

    if (existing) {
      throw new BadRequestException('You have already submitted a review for this contract');
    }

    return this.prisma.review.create({
      data: {
        contractId: data.contractId,
        reviewerId,
        revieweeId,
        ratingOverall: data.ratingOverall,
        ratingCommunication: data.ratingCommunication,
        ratingSkill: data.ratingSkill,
        ratingTimeliness: data.ratingTimeliness,
        comment: data.comment,
      },
    });
  }

  async getAverageRating(userId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { revieweeId: userId },
    });

    if (reviews.length === 0) {
      return {
        averageOverall: 0,
        averageCommunication: 0,
        averageSkill: 0,
        averageTimeliness: 0,
        count: 0,
      };
    }

    const sumOverall = reviews.reduce((sum, r) => sum + r.ratingOverall, 0);
    const sumComm = reviews.reduce((sum, r) => sum + r.ratingCommunication, 0);
    const sumSkill = reviews.reduce((sum, r) => sum + r.ratingSkill, 0);
    const sumTime = reviews.reduce((sum, r) => sum + r.ratingTimeliness, 0);

    const count = reviews.length;

    return {
      averageOverall: Math.round((sumOverall / count) * 100) / 100,
      averageCommunication: Math.round((sumComm / count) * 100) / 100,
      averageSkill: Math.round((sumSkill / count) * 100) / 100,
      averageTimeliness: Math.round((sumTime / count) * 100) / 100,
      count,
    };
  }

  async getUserReviews(userId: string, type: 'written' | 'received') {
    if (type === 'written') {
      return this.prisma.review.findMany({
        where: { reviewerId: userId },
        include: {
          reviewee: { select: { id: true, username: true } },
          contract: { include: { job: true } },
        },
      });
    }

    return this.prisma.review.findMany({
      where: { revieweeId: userId },
      include: {
        reviewer: { select: { id: true, username: true } },
        contract: { include: { job: true } },
      },
    });
  }
}
