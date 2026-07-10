import { Controller, Get, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview() {
    return this.analyticsService.getPlatformOverview();
  }

  @Get('skills')
  async getSkills() {
    return this.analyticsService.getTopSkills();
  }

  @Get('financials')
  @UseGuards(JwtAuthGuard)
  async getFinancials(@CurrentUser() user: any) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Access denied. Admin required.');
    }
    return this.analyticsService.getFinancials();
  }

  @Get('client/:clientId')
  @UseGuards(JwtAuthGuard)
  async getClientSpending(
    @CurrentUser() user: any,
    @Param('clientId') clientId: string,
  ) {
    // Only the client themselves or an admin can access this
    if (user.id !== clientId && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Access denied.');
    }
    return this.analyticsService.getClientSpending(clientId);
  }
}
