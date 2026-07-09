import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(
    @Body('email') email: string,
    @Body('username') username: string,
    @Body('password') passwordRaw: string,
    @Body('role') role: Role,
  ) {
    return this.authService.signup(email, username, passwordRaw, role);
  }

  @Post('signin')
  async signin(
    @Body('email') email: string,
    @Body('password') passwordRaw: string,
  ) {
    return this.authService.signin(email, passwordRaw);
  }

  @Get('siwe/nonce')
  async getSiweNonce() {
    const nonce = await this.authService.generateSiweNonce();
    return { nonce };
  }

  @Post('siwe/verify')
  async verifySiwe(
    @Body('message') message: string,
    @Body('signature') signature: string,
  ) {
    return this.authService.verifySiweMessage(message, signature);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: any) {
    return user;
  }
}
