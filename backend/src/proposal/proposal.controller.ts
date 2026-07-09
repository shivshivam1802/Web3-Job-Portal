import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ProposalService } from './proposal.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProposalStatus } from '@prisma/client';

@Controller('proposals')
@UseGuards(JwtAuthGuard)
export class ProposalController {
  constructor(private readonly proposalService: ProposalService) {}

  @Post()
  async submit(
    @CurrentUser() user: any,
    @Body('jobId') jobId: string,
    @Body('bidAmount') bidAmount: number,
    @Body('deliveryDays') deliveryDays: number,
    @Body('coverLetter') coverLetter: string,
    @Body('attachments') attachments: string[],
  ) {
    return this.proposalService.submitProposal(user.id, user.role, {
      jobId,
      bidAmount,
      deliveryDays,
      coverLetter,
      attachments,
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('bidAmount') bidAmount?: number,
    @Body('deliveryDays') deliveryDays?: number,
    @Body('coverLetter') coverLetter?: string,
    @Body('attachments') attachments?: string[],
  ) {
    return this.proposalService.updateProposal(id, user.id, {
      bidAmount,
      deliveryDays,
      coverLetter,
      attachments,
    });
  }

  @Post(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('status') status: ProposalStatus,
  ) {
    return this.proposalService.updateStatus(id, user.id, status);
  }

  @Get('job/:jobId')
  async getJobProposals(
    @Param('jobId') jobId: string,
    @CurrentUser() user: any,
  ) {
    return this.proposalService.getProposalsForJob(jobId, user.id, user.role);
  }
}
