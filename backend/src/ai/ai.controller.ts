import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('parse-resume')
  async parseResume(@Body('text') text: string) {
    return this.aiService.parseResume(text);
  }

  @Post('match-proposal')
  async matchProposal(
    @Body('jobDescription') jobDescription: string,
    @Body('proposalCoverLetter') proposalCoverLetter: string,
  ) {
    return this.aiService.matchProposal(jobDescription, proposalCoverLetter);
  }

  @Post('analyze-risk')
  async analyzeRisk(@Body('text') text: string) {
    return this.aiService.analyzeRisk(text);
  }

  @Post('recommend-jobs')
  async recommendJobs(
    @Body('skills') skills: string[],
    @Body('jobs') jobs: any[],
  ) {
    return this.aiService.recommendJobs(skills, jobs);
  }

  @Post('optimize-proposal')
  async optimizeProposal(
    @Body('jobDescription') jobDescription: string,
    @Body('freelancerProfile') freelancerProfile: any,
  ) {
    return this.aiService.optimizeProposal(jobDescription, freelancerProfile);
  }

  @Post('summarize-contract')
  async summarizeContract(@Body('terms') terms: string) {
    return this.aiService.summarizeContract(terms);
  }
}
