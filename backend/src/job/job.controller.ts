import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JobService } from './job.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JobStatus } from '@prisma/client';

@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createJob(
    @CurrentUser() user: any,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('category') category: string,
    @Body('tags') tags: string[],
    @Body('budget') budget: number,
    @Body('isMilestoneBased') isMilestoneBased?: boolean,
    @Body('tokenAddress') tokenAddress?: string,
    @Body('chainId') chainId?: number,
  ) {
    return this.jobService.create(user.id, user.role, {
      title,
      description,
      category,
      tags,
      budget,
      isMilestoneBased,
      tokenAddress,
      chainId,
    });
  }

  @Get()
  async getOpenJobs() {
    return this.jobService.listJobs();
  }

  @Get('search')
  async searchJobs(
    @Query('query') query?: string,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('minBudget') minBudget?: string,
    @Query('maxBudget') maxBudget?: string,
    @Query('chainId') chainId?: string,
    @Query('status') status?: JobStatus,
  ) {
    const minBudgetNum = minBudget ? parseFloat(minBudget) : undefined;
    const maxBudgetNum = maxBudget ? parseFloat(maxBudget) : undefined;
    const chainIdNum = chainId ? parseInt(chainId, 10) : undefined;

    return this.jobService.searchJobs({
      query,
      category,
      tag,
      minBudget: minBudgetNum,
      maxBudget: maxBudgetNum,
      chainId: chainIdNum,
      status,
    });
  }

  @Get(':id')
  async getJobDetail(@Param('id') id: string) {
    return this.jobService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateJob(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('title') title?: string,
    @Body('description') description?: string,
    @Body('category') category?: string,
    @Body('tags') tags?: string[],
    @Body('budget') budget?: number,
    @Body('status') status?: JobStatus,
  ) {
    return this.jobService.update(id, user.id, {
      title,
      description,
      category,
      tags,
      budget,
      status,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancelJob(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.jobService.remove(id, user.id);
  }
}
