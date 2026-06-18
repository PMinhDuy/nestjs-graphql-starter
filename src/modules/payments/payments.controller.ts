import { Controller, Post, Headers, Req, RawBodyRequest, HttpCode, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { Public } from '../../common/decorators';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Public()
  @Post('webhook')
  @HttpCode(200)
  async stripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!signature) throw new BadRequestException('Missing stripe-signature header');
    const raw = req.rawBody;
    if (!raw) throw new BadRequestException('No raw body available');
    await this.paymentsService.handleWebhook(raw, signature);
    return { received: true };
  }
}
