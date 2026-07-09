import { Module } from '@nestjs/common';
import { FreelancerService } from './freelancer.service';
import { FreelancerController } from './freelancer.controller';

@Module({
  providers: [FreelancerService],
  controllers: [FreelancerController]
})
export class FreelancerModule {}
