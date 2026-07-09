import { Module } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { ContractModule } from '../contract/contract.module';

@Module({
  imports: [ContractModule],
  providers: [IndexerService]
})
export class IndexerModule {}
