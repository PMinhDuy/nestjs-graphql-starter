import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Payment, PaymentStatus } from './payment.entity';
import { PaymentsService } from './payments.service';

const mockSessionCreate = jest.fn();
const mockSessionRetrieve = jest.fn();
const mockConstructEvent = jest.fn();

jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: { create: mockSessionCreate, retrieve: mockSessionRetrieve },
    },
    webhooks: { constructEvent: mockConstructEvent },
  })),
);

const MOCK_SESSION = { id: 'cs_test_123', url: 'https://checkout.stripe.com/test' };

const MOCK_ORDER = {
  id: 'order-1',
  userId: 'user-1',
  status: OrderStatus.PENDING,
  totalAmount: 99.99,
};

describe('PaymentsService', () => {
  let service: PaymentsService;

  let orderRepo: { findOne: jest.Mock; update: jest.Mock };
  let itemRepo: { createQueryBuilder: jest.Mock };
  let paymentRepo: { findOneBy: jest.Mock; save: jest.Mock; create: jest.Mock; update: jest.Mock };

  // Repos used inside dataSource.transaction callback
  let txPaymentRepo: { save: jest.Mock; create: jest.Mock; update: jest.Mock };
  let txOrderRepo: { update: jest.Mock };
  let mockDataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    txPaymentRepo = { save: jest.fn().mockResolvedValue({}), create: jest.fn().mockImplementation((d) => d), update: jest.fn().mockResolvedValue({}) };
    txOrderRepo = { update: jest.fn().mockResolvedValue({}) };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb) =>
        cb({
          getRepository: jest.fn().mockImplementation((entity) => {
            if (entity === Payment) return txPaymentRepo;
            if (entity === Order) return txOrderRepo;
            return {};
          }),
        }),
      ),
    };

    orderRepo = { findOne: jest.fn(), update: jest.fn() };
    paymentRepo = {
      findOneBy: jest.fn(),
      save: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockImplementation((d) => d),
      update: jest.fn().mockResolvedValue({}),
    };

    // Default queryBuilder chain — returns empty line_items (no stock issues)
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    itemRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'STRIPE_SECRET_KEY') return 'sk_test_key';
              if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
              return undefined;
            }),
          },
        },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: itemRepo },
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
      ],
    }).compile();

    service = module.get(PaymentsService);
    jest.clearAllMocks();

    // Re-apply post-clearAllMocks defaults
    mockSessionCreate.mockResolvedValue(MOCK_SESSION);
    mockDataSource.transaction.mockImplementation(async (cb) =>
      cb({
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === Payment) return txPaymentRepo;
          if (entity === Order) return txOrderRepo;
          return {};
        }),
      }),
    );
    txPaymentRepo.create.mockImplementation((d) => d);
    txPaymentRepo.save.mockResolvedValue({});
    txOrderRepo.update.mockResolvedValue({});
    paymentRepo.create.mockImplementation((d) => d);
    paymentRepo.save.mockResolvedValue({});
    const qb2 = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    itemRepo.createQueryBuilder.mockReturnValue(qb2);
  });

  // ── createCheckoutSession ────────────────────────────────────────────────

  describe('createCheckoutSession', () => {
    it('returns session URL, saves Payment and sets order to AWAITING_PAYMENT', async () => {
      orderRepo.findOne.mockResolvedValue(MOCK_ORDER);
      paymentRepo.findOneBy.mockResolvedValue(null);

      const url = await service.createCheckoutSession('order-1', 'user-1');

      expect(url).toBe(MOCK_SESSION.url);
      expect(mockSessionCreate).toHaveBeenCalled();
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(txPaymentRepo.save).toHaveBeenCalled();
      expect(txOrderRepo.update).toHaveBeenCalledWith('order-1', { status: OrderStatus.AWAITING_PAYMENT });
    });

    it('reuses existing Stripe session when a PENDING payment already exists', async () => {
      orderRepo.findOne.mockResolvedValue(MOCK_ORDER);
      paymentRepo.findOneBy.mockResolvedValue({ id: 'pay-1', stripeSessionId: 'cs_test_123', status: PaymentStatus.PENDING });
      mockSessionRetrieve.mockResolvedValue(MOCK_SESSION);

      const url = await service.createCheckoutSession('order-1', 'user-1');

      expect(url).toBe(MOCK_SESSION.url);
      expect(mockSessionCreate).not.toHaveBeenCalled();
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when order does not exist', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.createCheckoutSession('bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when order is not PENDING', async () => {
      orderRepo.findOne.mockResolvedValue({ ...MOCK_ORDER, status: OrderStatus.CONFIRMED });
      await expect(service.createCheckoutSession('order-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when Stripe returns no session URL', async () => {
      orderRepo.findOne.mockResolvedValue(MOCK_ORDER);
      paymentRepo.findOneBy.mockResolvedValue(null);
      mockSessionCreate.mockResolvedValue({ id: 'cs_test_123', url: null });

      await expect(service.createCheckoutSession('order-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── handleWebhook ────────────────────────────────────────────────────────

  describe('handleWebhook', () => {
    it('throws BadRequestException on invalid Stripe signature', async () => {
      mockConstructEvent.mockImplementation(() => { throw new Error('signature mismatch'); });
      await expect(service.handleWebhook(Buffer.from('{}'), 'bad-sig')).rejects.toThrow(BadRequestException);
    });

    describe('checkout.session.completed', () => {
      const completedEvent = {
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test_123', metadata: { orderId: 'order-1' } } },
      };

      beforeEach(() => mockConstructEvent.mockReturnValue(completedEvent));

      it('sets Payment to SUCCEEDED and Order to CONFIRMED', async () => {
        paymentRepo.findOneBy.mockResolvedValue({ id: 'pay-1', status: PaymentStatus.PENDING });

        await service.handleWebhook(Buffer.from('{}'), 'sig');

        expect(mockDataSource.transaction).toHaveBeenCalled();
        expect(txPaymentRepo.update).toHaveBeenCalledWith('pay-1', { status: PaymentStatus.SUCCEEDED });
        expect(txOrderRepo.update).toHaveBeenCalledWith('order-1', { status: OrderStatus.CONFIRMED });
      });

      it('is a no-op when payment is already SUCCEEDED (idempotent)', async () => {
        paymentRepo.findOneBy.mockResolvedValue({ id: 'pay-1', status: PaymentStatus.SUCCEEDED });

        await service.handleWebhook(Buffer.from('{}'), 'sig');

        expect(mockDataSource.transaction).not.toHaveBeenCalled();
      });

      it('is a no-op when no payment record found', async () => {
        paymentRepo.findOneBy.mockResolvedValue(null);

        await service.handleWebhook(Buffer.from('{}'), 'sig');

        expect(mockDataSource.transaction).not.toHaveBeenCalled();
      });
    });

    describe('checkout.session.expired', () => {
      const expiredEvent = {
        type: 'checkout.session.expired',
        data: { object: { id: 'cs_test_123', metadata: { orderId: 'order-1' } } },
      };

      beforeEach(() => mockConstructEvent.mockReturnValue(expiredEvent));

      it('sets Payment to FAILED and Order to PAYMENT_FAILED', async () => {
        paymentRepo.findOneBy.mockResolvedValue({ id: 'pay-1', status: PaymentStatus.PENDING });

        await service.handleWebhook(Buffer.from('{}'), 'sig');

        expect(mockDataSource.transaction).toHaveBeenCalled();
        expect(txPaymentRepo.update).toHaveBeenCalledWith('pay-1', { status: PaymentStatus.FAILED });
        expect(txOrderRepo.update).toHaveBeenCalledWith('order-1', { status: OrderStatus.PAYMENT_FAILED });
      });

      it('is a no-op when payment is already FAILED (idempotent)', async () => {
        paymentRepo.findOneBy.mockResolvedValue({ id: 'pay-1', status: PaymentStatus.FAILED });

        await service.handleWebhook(Buffer.from('{}'), 'sig');

        expect(mockDataSource.transaction).not.toHaveBeenCalled();
      });
    });

    it('is a no-op for unhandled event types', async () => {
      mockConstructEvent.mockReturnValue({ type: 'charge.refunded', data: { object: {} } });

      await service.handleWebhook(Buffer.from('{}'), 'sig');

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });
});
