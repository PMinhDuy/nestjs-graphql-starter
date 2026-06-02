import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

type StripeClient = InstanceType<typeof Stripe>;

@Injectable()
export class PaymentsService {
  private stripe: StripeClient;

  constructor(
    private config: ConfigService,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
  ) {
    this.stripe = new Stripe(config.get<string>('STRIPE_SECRET_KEY') ?? '', {
      // Use latest supported API version
    });
  }

  async createCheckoutSession(orderId: string, userId: string): Promise<string> {
    const order = await this.orderRepo.findOne({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not in PENDING status');
    }

    const items = await this.itemRepo
      .createQueryBuilder('oi')
      .leftJoinAndSelect('products', 'p', 'p.id = oi.productId')
      .where('oi.orderId = :orderId', { orderId })
      .select(['oi.unitPrice', 'oi.quantity', 'oi.productId', 'p.name'])
      .getRawMany<{ oi_unitPrice: number; oi_quantity: number; oi_productId: string; p_name: string }>();

    const lineItems = items.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: { name: item.p_name ?? `Product #${item.oi_productId}` },
        unit_amount: Math.round((item.oi_unitPrice ?? 0) * 100),
      },
      quantity: item.oi_quantity,
    }));

    const successUrl = `${this.config.get('STRIPE_SUCCESS_URL') ?? 'http://localhost:4200/orders/success'}/${orderId}?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${this.config.get('STRIPE_CANCEL_URL') ?? 'http://localhost:4200/checkout'}?cancelled=true`;

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      metadata: { orderId, userId },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return session.url ?? '';
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) throw new BadRequestException('Stripe webhook secret not configured');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event: { type: string; data: { object: any } };
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as { metadata?: { orderId?: string } };
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await this.orderRepo.update(orderId, { status: OrderStatus.CONFIRMED });
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as { metadata?: { orderId?: string } };
      const orderId = intent.metadata?.orderId;
      if (orderId) {
        await this.orderRepo.update(orderId, { status: OrderStatus.CANCELLED });
      }
    }
  }
}
