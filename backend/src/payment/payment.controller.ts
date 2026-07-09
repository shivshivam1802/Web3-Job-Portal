import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PaymentType } from '@prisma/client';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  async logPayment(
    @Body('contractId') contractId: string,
    @Body('sender') sender: string,
    @Body('recipient') recipient: string,
    @Body('amount') amount: number,
    @Body('txHash') txHash: string,
    @Body('type') type: PaymentType,
    @Body('tokenAddress') tokenAddress?: string,
  ) {
    return this.paymentService.logPayment({
      contractId,
      sender,
      recipient,
      amount,
      txHash,
      type,
      tokenAddress,
    });
  }

  @Get('contract/:contractId')
  async getContractPayments(@Param('contractId') contractId: string) {
    return this.paymentService.getContractPayments(contractId);
  }

  @Get('history')
  async getMyPaymentHistory(@CurrentUser() user: any) {
    return this.paymentService.getUserPayments(user.id);
  }
}
