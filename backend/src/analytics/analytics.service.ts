import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContractStatus, JobStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getPlatformOverview() {
    const [jobsCount, activeContracts, freelancersCount, clientsCount] = await Promise.all([
      this.prisma.job.count({ where: { status: JobStatus.OPEN } }),
      this.prisma.contract.count({ where: { status: ContractStatus.ACTIVE } }),
      this.prisma.user.count({ where: { role: 'FREELANCER' } }),
      this.prisma.user.count({ where: { role: 'CLIENT' } }),
    ]);

    return {
      openJobs: jobsCount,
      activeContracts,
      freelancers: freelancersCount,
      clients: clientsCount,
    };
  }

  async getFinancials() {
    const [tvlResult, volumeResult] = await Promise.all([
      this.prisma.contract.aggregate({
        _sum: { totalBudget: true },
        where: { status: ContractStatus.ACTIVE },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
      }),
    ]);

    const tvl = Number(tvlResult._sum.totalBudget || 0);
    const volume = Number(volumeResult._sum.amount || 0);

    // Assume 2.5% platform fee on all payments volume as platform revenue
    const revenue = volume * 0.025;

    return {
      totalValueLocked: tvl,
      transactionVolume: volume,
      platformRevenue: revenue,
    };
  }

  async getTopSkills() {
    // Fetch jobs to aggregate tags
    const jobs = await this.prisma.job.findMany({
      select: { tags: true },
    });

    const skillCounts: Record<string, number> = {};

    for (const job of jobs) {
      for (const tag of job.tags) {
        skillCounts[tag] = (skillCounts[tag] || 0) + 1;
      }
    }

    const sortedSkills = Object.entries(skillCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return sortedSkills;
  }

  async getClientSpending(clientId: string) {
    const contracts = await this.prisma.contract.findMany({
      where: { clientId },
      select: { totalBudget: true, status: true, createdAt: true },
    });

    const totalSpent = contracts
      .filter((c) => c.status === ContractStatus.COMPLETED)
      .reduce((sum, c) => sum + Number(c.totalBudget), 0);

    const activeCommitted = contracts
      .filter((c) => c.status === ContractStatus.ACTIVE)
      .reduce((sum, c) => sum + Number(c.totalBudget), 0);

    return {
      totalSpent,
      activeCommitted,
      contractsCount: contracts.length,
      history: contracts,
    };
  }
}
