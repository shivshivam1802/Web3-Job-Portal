import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { KycStatus } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    return this.userService.findOne(user.id);
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser() user: any,
    @Body('email') email?: string,
    @Body('username') username?: string,
    @Body('walletAddress') walletAddress?: string,
  ) {
    return this.userService.updateProfile(user.id, { email, username, walletAddress });
  }

  @Post('kyc')
  async updateKyc(
    @CurrentUser() user: any,
    @Body('status') status: KycStatus,
  ) {
    return this.userService.updateKycStatus(user.id, status);
  }

  @Post('2fa')
  async configure2FA(
    @CurrentUser() user: any,
    @Body('enabled') enabled: boolean,
    @Body('secret') secret?: string,
  ) {
    return this.userService.configure2FA(user.id, enabled, secret);
  }

  @Get()
  async getAllUsers() {
    return this.userService.listAllUsers();
  }
}
