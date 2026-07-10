import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { FreelancerModule } from './freelancer/freelancer.module';
import { ClientModule } from './client/client.module';
import { JobModule } from './job/job.module';
import { ProposalModule } from './proposal/proposal.module';
import { ContractModule } from './contract/contract.module';
import { IndexerModule } from './indexer/indexer.module';
import { PaymentModule } from './payment/payment.module';
import { ReviewModule } from './review/review.module';
import { DisputeModule } from './dispute/dispute.module';
import { ChatModule } from './chat/chat.module';
import { IpfsModule } from './ipfs/ipfs.module';
import { NotificationModule } from './notification/notification.module';
import { AiModule } from './ai/ai.module';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { APP_GUARD } from '@nestjs/core';
import { RateLimiterGuard } from './redis/rate-limiter.guard';
import { HealthModule } from './health/health.module';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule, UserModule, FreelancerModule, ClientModule, JobModule, ProposalModule, ContractModule, IndexerModule, PaymentModule, ReviewModule, DisputeModule, ChatModule, IpfsModule, NotificationModule, AiModule, AdminModule, AnalyticsModule, HealthModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RateLimiterGuard,
    },
  ],
})
export class AppModule {}
