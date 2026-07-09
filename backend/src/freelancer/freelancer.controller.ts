import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { FreelancerService } from './freelancer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('freelancers')
export class FreelancerController {
  constructor(private readonly freelancerService: FreelancerService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@CurrentUser() user: any) {
    return this.freelancerService.findByUserId(user.id);
  }

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(
    @CurrentUser() user: any,
    @Body('title') title: string,
    @Body('bio') bio: string,
    @Body('skills') skills: string[],
    @Body('hourlyRate') hourlyRate: number,
    @Body('githubUrl') githubUrl?: string,
    @Body('portfolio') portfolio?: any,
    @Body('experience') experience?: any,
    @Body('certificates') certificates?: any,
    @Body('resumeUrl') resumeUrl?: string,
  ) {
    return this.freelancerService.upsertProfile(user.id, {
      title,
      bio,
      skills,
      hourlyRate,
      githubUrl,
      portfolio,
      experience,
      certificates,
      resumeUrl,
    });
  }

  @Get()
  async getFreelancers(
    @Query('skill') skill?: string,
    @Query('maxRate') maxRate?: string,
  ) {
    const maxRateNum = maxRate ? parseFloat(maxRate) : undefined;
    return this.freelancerService.listFreelancers({ skill, maxRate: maxRateNum });
  }
}
