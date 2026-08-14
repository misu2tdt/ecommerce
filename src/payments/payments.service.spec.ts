import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { OrderStatus } from '../orders/entities/order-status.enum';
import { Order } from '../orders/entities/order.entity';
import {
  PaymentEventProcessingStatus,
  PaymentEventType,
} from './entities/payment-event-type.enum';
import { PaymentEvent } from './entities/payment-event.entity';
import { PaymentStatus } from './entities/payment-status.enum';
import { Payment } from './entities/payment.entity';
import { FakePaymentProvider } from './fake-payment.provider';
import { PaymentsService } from './payments.service';

describe('PaymentsService state rules', () => {
  const provider = new FakePaymentProvider();
  const service = new PaymentsService({} as DataSource, provider, 'VND');

  it('requires a normalized safe idempotency key before database work', () => {
    const normalize = privateMethod<(value?: string) => string>(
      service,
      'normalizeIdempotencyKey',
    );
    expect(normalize('  payment.key-001  ')).toBe('payment.key-001');
    for (const invalid of [undefined, '', 'short', 'unsafe key', '🔥🔥🔥'])
      expect(() => normalize(invalid)).toThrow(BadRequestException);
  });

  it('reuses a key only for the same logical owner and Order', () => {
    const assertReusable = privateMethod<
      (payment: Payment, userId: number, orderId: number) => Payment
    >(service, 'assertReusable');
    const payment = paymentFixture();
    expect(assertReusable(payment, 7, 3)).toBe(payment);
    expect(() => assertReusable(payment, 8, 3)).toThrow(ConflictException);
    expect(() => assertReusable(payment, 7, 4)).toThrow(ConflictException);
  });

  it('atomically succeeds Payment and confirms its pending Order', async () => {
    const paymentRepo = { save: jest.fn(async (value) => value) };
    const orderRepo = { save: jest.fn(async (value) => value) };
    const manager = managerWith(paymentRepo, orderRepo);
    const payment = paymentFixture();
    const order = orderFixture();
    const event = eventFixture();

    await privateMethod<
      (
        manager: EntityManager,
        payment: Payment,
        order: Order,
        event: PaymentEvent,
      ) => Promise<void>
    >(service, 'processSuccess')(manager, payment, order, event);

    expect(payment.status).toBe(PaymentStatus.SUCCEEDED);
    expect(payment.succeededAt).toBeInstanceOf(Date);
    expect(order.status).toBe(OrderStatus.CONFIRMED);
    expect(paymentRepo.save).toHaveBeenCalledWith(payment);
    expect(orderRepo.save).toHaveBeenCalledWith(order);
  });

  it('flags success after cancellation for reconciliation without invalid state', async () => {
    const paymentRepo = { save: jest.fn() };
    const orderRepo = { save: jest.fn() };
    const payment = paymentFixture({ status: PaymentStatus.CANCELLED });
    const order = orderFixture({ status: OrderStatus.CANCELLED });
    const event = eventFixture();

    await privateMethod<
      (
        manager: EntityManager,
        payment: Payment,
        order: Order,
        event: PaymentEvent,
      ) => Promise<void>
    >(service, 'processSuccess')(
      managerWith(paymentRepo, orderRepo),
      payment,
      order,
      event,
    );

    expect(payment.status).toBe(PaymentStatus.CANCELLED);
    expect(order.status).toBe(OrderStatus.CANCELLED);
    expect(event.processingStatus).toBe(
      PaymentEventProcessingStatus.REQUIRES_RECONCILIATION,
    );
    expect(paymentRepo.save).not.toHaveBeenCalled();
    expect(orderRepo.save).not.toHaveBeenCalled();
  });

  it('sanitizes failure details and leaves the Order lifecycle untouched', async () => {
    const paymentRepo = { save: jest.fn(async (value) => value) };
    const payment = paymentFixture();
    const event = eventFixture({ eventType: PaymentEventType.FAILED });

    await privateMethod<
      (
        manager: EntityManager,
        payment: Payment,
        event: PaymentEvent,
        input: {
          failureCode?: string;
          failureMessage?: string;
        },
      ) => Promise<void>
    >(service, 'processFailure')(
      managerWith(paymentRepo, { save: jest.fn() }),
      payment,
      event,
      {
        failureCode: ' DECLINED\nunsafe ',
        failureMessage: ' Card\twas\ndeclined ',
      },
    );

    expect(payment.status).toBe(PaymentStatus.FAILED);
    expect(payment.failureCode).toBe('DECLINED unsafe');
    expect(payment.failureMessage).toBe('Card was declined');
  });
});

function privateMethod<T>(target: object, name: string): T {
  const method = (target as unknown as Record<string, Function>)[name];
  return method.bind(target) as T;
}

function managerWith(paymentRepo: object, orderRepo: object): EntityManager {
  return {
    getRepository: jest.fn((entity) =>
      entity === Payment ? paymentRepo : orderRepo,
    ),
  } as unknown as EntityManager;
}

function paymentFixture(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 1,
    orderId: 3,
    order: orderFixture(),
    provider: 'fake',
    providerPaymentId: 'fake_payment_1',
    idempotencyKey: 'payment-key-001',
    amount: 400_000,
    currency: 'VND',
    status: PaymentStatus.PROCESSING,
    failureCode: null,
    failureMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    succeededAt: null,
    ...overrides,
  };
}

function orderFixture(overrides: Partial<Order> = {}): Order {
  return {
    id: 3,
    userId: 7,
    user: { id: 7 } as Order['user'],
    totalPrice: 400_000,
    status: OrderStatus.PENDING,
    shippingAddress: {} as Order['shippingAddress'],
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function eventFixture(overrides: Partial<PaymentEvent> = {}): PaymentEvent {
  return {
    id: 5,
    paymentId: 1,
    payment: paymentFixture(),
    provider: 'fake',
    providerEventId: 'event-1',
    providerPaymentId: 'fake_payment_1',
    eventType: PaymentEventType.SUCCEEDED,
    processingStatus: PaymentEventProcessingStatus.PROCESSED,
    processingMessage: null,
    createdAt: new Date(),
    processedAt: null,
    ...overrides,
  };
}
