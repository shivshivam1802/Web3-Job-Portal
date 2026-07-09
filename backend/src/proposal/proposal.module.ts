import { Module } from '@nestjs/common';
import { ProposalService } from './proposal.service';
import { ProposalController } from './proposal.controller';

@Module({
  providers: [ProposalService],
  controllers: [ProposalController],
  exports: [ProposalService],
})
export class ProposalModule {}
