import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createPublicClient, http } from 'viem';
import { localhost } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';
import { ContractService } from '../contract/contract.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IndexerService implements OnModuleInit, OnModuleDestroy {
  private publicClient: any;
  private unwatchFactory: any;
  private activeWatchers = new Map<string, () => void>();

  constructor(
    private contractService: ContractService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    console.log('Initializing Blockchain Event Indexer...');
    
    const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545';
    this.publicClient = createPublicClient({
      chain: localhost,
      transport: http(rpcUrl),
    });

    try {
      const deployInfoPath = path.join(__dirname, '../../../contracts/deployments/deploy-info.json');
      const factoryAbiPath = path.join(__dirname, '../../../contracts/deployments/abis/JobFactory.json');
      
      if (!fs.existsSync(deployInfoPath) || !fs.existsSync(factoryAbiPath)) {
        console.warn('Deployment configuration or ABIs not found. Skipping indexer startup.');
        return;
      }

      const deployInfo = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));
      const factoryAbi = JSON.parse(fs.readFileSync(factoryAbiPath, 'utf8'));
      const factoryAddress = deployInfo.jobFactory;

      console.log(`Watching JobFactory at address: ${factoryAddress}`);

      this.unwatchFactory = this.publicClient.watchContractEvent({
        address: factoryAddress,
        abi: factoryAbi,
        eventName: 'JobContractDeployed',
        onLogs: async (logs: any) => {
          for (const log of logs) {
            const { cloneAddress, client, freelancer, jobId } = log.args;
            console.log(`Captured clone deployment: ${cloneAddress} for Job ID: ${jobId}`);
            await this.handleJobContractDeployed(cloneAddress, client, freelancer, jobId);
            this.watchJobContract(cloneAddress);
          }
        },
      });

      const existingJobs = await this.prisma.job.findMany({
        where: {
          escrowAddress: { not: null },
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      });

      for (const j of existingJobs) {
        if (j.escrowAddress) {
          this.watchJobContract(j.escrowAddress);
        }
      }

    } catch (err) {
      console.error('Failed to initialize contract indexer:', err);
    }
  }

  onModuleDestroy() {
    if (this.unwatchFactory) this.unwatchFactory();
    for (const unwatch of this.activeWatchers.values()) {
      unwatch();
    }
    this.activeWatchers.clear();
  }

  private async handleJobContractDeployed(
    cloneAddress: string,
    client: string,
    freelancer: string,
    jobId: string,
  ) {
    try {
      const proposal = await this.prisma.proposal.findFirst({
        where: {
          jobId,
          freelancer: { walletAddress: freelancer.toLowerCase() },
        },
        include: { job: true },
      });

      if (proposal) {
        await this.contractService.createContract(proposal.job.clientId, {
          jobId,
          freelancerId: proposal.freelancerId,
          totalBudget: Number(proposal.bidAmount),
          escrowAddress: cloneAddress,
          chainId: 31337,
          milestones: [
            { title: 'Milestone 0', description: 'Initial stage', budget: Number(proposal.bidAmount), index: 0 }
          ],
        });
        console.log(`Synced contract details in database for Job ID: ${jobId}`);
      }
    } catch (error) {
      console.error(`Failed to handle clone deployment: ${error}`);
    }
  }

  private watchJobContract(address: string) {
    if (this.activeWatchers.has(address)) return;

    try {
      const jobContractAbiPath = path.join(__dirname, '../../../contracts/deployments/abis/JobContract.json');
      if (!fs.existsSync(jobContractAbiPath)) return;

      const jobContractAbi = JSON.parse(fs.readFileSync(jobContractAbiPath, 'utf8'));
      console.log(`Spinning up logs listener for JobContract proxy at: ${address}`);

      const unwatch = this.publicClient.watchContractEvent({
        address: address as `0x${string}`,
        abi: jobContractAbi,
        onLogs: async (logs: any) => {
          for (const log of logs) {
            console.log(`Captured event log from JobContract ${address}:`, log.eventName);
            if (log.eventName === 'MilestoneFunded') {
              const { index } = log.args;
              await this.contractService.fundMilestone(address, Number(index));
            }
          }
        },
      });

      this.activeWatchers.set(address, unwatch);
    } catch (err) {
      console.error(`Failed to watch JobContract at ${address}:`, err);
    }
  }
}
