import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ClientService } from './client.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@CurrentUser() user: any) {
    return this.clientService.findByUserId(user.id);
  }

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(
    @CurrentUser() user: any,
    @Body('companyName') companyName?: string,
    @Body('companyWebsite') companyWebsite?: string,
    @Body('location') location?: string,
    @Body('bio') bio?: string,
  ) {
    return this.clientService.upsertProfile(user.id, {
      companyName,
      companyWebsite,
      location,
      bio,
    });
  }

  @Get()
  async getClients() {
    return this.clientService.listClients();
  }
}
