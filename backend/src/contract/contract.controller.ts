import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ContractService } from './contract.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post()
  async createContract(
    @CurrentUser() user: any,
    @Body('jobId') jobId: string,
    @Body('freelancerId') freelancerId: string,
    @Body('totalBudget') totalBudget: number,
    @Body('escrowAddress') escrowAddress: string,
    @Body('chainId') chainId: number,
    @Body('tokenAddress') tokenAddress?: string,
    @Body('milestones') milestones?: any[],
  ) {
    return this.contractService.createContract(user.id, {
      jobId,
      freelancerId,
      totalBudget,
      escrowAddress,
      chainId,
      tokenAddress,
      milestones: milestones || [],
    });
  }

  @Get(':id')
  async getContractDetail(@Param('id') id: string) {
    return this.contractService.findOne(id);
  }

  @Post(':id/milestones/:index/submit')
  async submitWork(
    @Param('id') id: string,
    @Param('index') index: string,
    @CurrentUser() user: any,
    @Body('ipfsHash') ipfsHash: string,
  ) {
    const idxNum = parseInt(index, 10);
    return this.contractService.submitWork(id, idxNum, ipfsHash, user.id);
  }

  @Post(':id/milestones/:index/approve')
  async approveWork(
    @Param('id') id: string,
    @Param('index') index: string,
    @CurrentUser() user: any,
  ) {
    const idxNum = parseInt(index, 10);
    return this.contractService.approveMilestone(id, idxNum, user.id);
  }

  @Post(':id/milestones/:index/reject')
  async rejectWork(
    @Param('id') id: string,
    @Param('index') index: string,
    @CurrentUser() user: any,
    @Body('feedback') feedback: string,
  ) {
    const idxNum = parseInt(index, 10);
    return this.contractService.rejectMilestone(id, idxNum, feedback, user.id);
  }

  @Get()
  async getMyContracts(@CurrentUser() user: any) {
    return this.contractService.listUserContracts(user.id);
  }
}
