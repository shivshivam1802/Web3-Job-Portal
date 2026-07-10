import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JobStatus } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getUsers(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.adminService.getUsers(user.role, pageNum, limitNum);
  }

  @Post('jobs/:id/moderate')
  async moderateJob(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('status') status: JobStatus,
  ) {
    return this.adminService.moderateJob(user.role, id, status);
  }

  @Post('users/:id/blacklist')
  async blacklistUser(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.adminService.blacklistUser(user.role, id);
  }

  @Get('disputes')
  async getOpenDisputes(@CurrentUser() user: any) {
    return this.adminService.getOpenDisputes(user.role);
  }

  @Post('disputes/:id/resolve')
  async resolveDispute(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('freelancerShare') freelancerShare: number,
    @Body('clientShare') clientShare: number,
  ) {
    return this.adminService.resolveDispute(user.role, id, freelancerShare, clientShare);
  }
}
