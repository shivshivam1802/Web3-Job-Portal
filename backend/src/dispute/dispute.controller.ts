import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('disputes')
@UseGuards(JwtAuthGuard)
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  @Post()
  async raiseDispute(
    @CurrentUser() user: any,
    @Body('contractId') contractId: string,
    @Body('reason') reason: string,
  ) {
    return this.disputeService.raiseDispute(user.id, { contractId, reason });
  }

  @Get(':id')
  async getDetail(@Param('id') id: string) {
    return this.disputeService.findOne(id);
  }

  @Post(':id/evidence')
  async submitEvidence(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('url') url: string,
    @Body('description') description: string,
  ) {
    return this.disputeService.submitEvidence(id, user.id, url, description);
  }

  @Post(':id/vote')
  async submitVote(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('freelancerShare') freelancerShare: number,
    @Body('clientShare') clientShare: number,
  ) {
    // In production, we authenticate user wallet address for mediator checks
    const walletAddress = user.walletAddress || '0x0000000000000000000000000000000000000000';
    return this.disputeService.submitMediatorVote(id, walletAddress, freelancerShare, clientShare);
  }

  @Post(':id/resolve')
  async resolveDispute(@Param('id') id: string) {
    return this.disputeService.resolveDispute(id);
  }
}
