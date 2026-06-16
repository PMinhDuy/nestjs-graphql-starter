import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import Stripe from 'stripe';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Payment, PaymentStatus } from './payment.entity';

type StripeClient = InstanceType<typeof Stripe>;

@Injectable()
export class PaymentsService {
  private _stripe: StripeClient | null = null;

  constructor(
    private config: ConfigService,
    @InjectDataSource() private dataSource: DataSource,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
  ) {}

  private get stripe(): StripeClient {
    if (!this._stripe) {
      const key = this.config.get<string>('STRIPE_SECRET_KEY');
      if (!key) throw new BadRequestException('Stripe is not configured');
      this._stripe = new Stripe(key);
    }
    return this._stripe;
  }

  async createCheckoutSession(orderId: string, userId: string): Promise<string> {
    const order = await this.orderRepo.findOne({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not in PENDING status');
    }

    // Prevent duplicate sessions if a prior attempt already created a PENDING payment
    const existingPending = await this.paymentRepo.findOneBy({ orderId, status: PaymentStatus.PENDING });
    if (existingPending) {
      const existingSession = await this.stripe.checkout.sessions.retrieve(existingPending.stripeSessionId);
      if (existingSession.url) return existingSession.url;
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

    if (!session.url) throw new BadRequestException('Failed to create Stripe checkout session URL');

    // Atomic: save Payment record + update Order status together
    await this.dataSource.transaction(async (manager: EntityManager) => {
      await manager.getRepository(Payment).save(
        manager.getRepository(Payment).create({
          orderId,
          userId,
          stripeSessionId: session.id,
          amount: order.totalAmount,
          currency: 'usd',
          status: PaymentStatus.PENDING,
        }),
      );
      await manager.getRepository(Order).update(orderId, { status: OrderStatus.AWAITING_PAYMENT });
    });

    return session.url;
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
      const session = event.data.object as { id: string; metadata?: { orderId?: string } };
      const orderId = session.metadata?.orderId;
      if (!orderId) return;

      const payment = await this.paymentRepo.findOneBy({ stripeSessionId: session.id });
      if (!payment || payment.status !== PaymentStatus.PENDING) return;

      await this.dataSource.transaction(async (manager: EntityManager) => {
        await manager.getRepository(Payment).update(payment.id, { status: PaymentStatus.SUCCEEDED });
        await manager.getRepository(Order).update(orderId, { status: OrderStatus.CONFIRMED });
      });
    }

    // checkout.session.expired: user abandoned the Stripe Checkout page
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as { id: string; metadata?: { orderId?: string } };
      const orderId = session.metadata?.orderId;
      if (!orderId) return;

      const payment = await this.paymentRepo.findOneBy({ stripeSessionId: session.id });
      if (!payment || payment.status !== PaymentStatus.PENDING) return;

      await this.dataSource.transaction(async (manager: EntityManager) => {
        await manager.getRepository(Payment).update(payment.id, { status: PaymentStatus.FAILED });
        await manager.getRepository(Order).update(orderId, { status: OrderStatus.PAYMENT_FAILED });
      });
    }
  }
}
