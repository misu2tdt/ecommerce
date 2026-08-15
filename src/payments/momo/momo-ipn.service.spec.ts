import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaymentEventType } from '../entities/payment-event-type.enum';
import { PaymentStatus } from '../entities/payment-status.enum';
import { Payment } from '../entities/payment.entity';
import { PaymentsService } from '../payments.service';
import { MomoIpnDto } from './dto/momo-ipn.dto';
import type { MomoConfig } from './momo.config';
import { MomoIpnService } from './momo-ipn.service';
import { buildMomoOrderId, buildMomoRequestId } from './momo-identifiers';
import { buildMomoIpnCanonical, signMomo } from './momo.signature';

const IDENTITY_SECRET = 'test-identity-secret';
const ORDER_ID = buildMomoOrderId(42, IDENTITY_SECRET);
const REQUEST_ID = buildMomoRequestId(42, IDENTITY_SECRET);

describe('MomoIpnService', () => {
  const config: MomoConfig = {
    partnerCode: 'test-partner',
    accessKey: 'test-access',
    secretKey: 'test-secret',
    identitySecret: IDENTITY_SECRET,
    endpoint: 'https://test-payment.momo.vn',
    redirectUrl: 'https://merchant.test/payment-return',
    ipnUrl: 'https://merchant.test/payments/webhooks/momo',
    timeoutMs: 30_000,
  };
  const paymentRepo = { findOneBy: jest.fn() };
  const dataSource = { getRepository: jest.fn(() => paymentRepo) };
  const payments = { processEvent: jest.fn() };
  let service: MomoIpnService;

  beforeEach(() => {
    jest.clearAllMocks();
    paymentRepo.findOneBy.mockResolvedValue(payment());
    payments.processEvent.mockResolvedValue({ duplicate: false });
    service = new MomoIpnService(
      dataSource as unknown as DataSource,
      payments as unknown as PaymentsService,
      config,
    );
  });

  it('accepts a valid final success and translates it to the existing event core', async () => {
    await expect(service.process(signedIpn())).resolves.toEqual({
      state: 'succeeded',
      processed: true,
    });
    expect(payments.processEvent).toHaveBeenCalledWith({
      provider: 'momo',
      providerEventId: `${ORDER_ID}:123456:0`,
      providerPaymentId: ORDER_ID,
      eventType: PaymentEventType.SUCCEEDED,
    });
  });

  it('rejects invalid signature before any database lookup or mutation', async () => {
    await expect(
      service.process({ ...signedIpn(), signature: '0'.repeat(64) }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(paymentRepo.findOneBy).not.toHaveBeenCalled();
    expect(payments.processEvent).not.toHaveBeenCalled();
  });

  it.each([
    ['partnerCode', 'wrong-partner'],
    ['orderId', buildMomoOrderId(41, IDENTITY_SECRET)],
    ['requestId', buildMomoRequestId(41, IDENTITY_SECRET)],
    ['amount', 150_001],
  ] as const)(
    'rejects business mismatch for %s without mutation',
    async (key, value) => {
      await expect(
        service.process(signedIpn({ [key]: value })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(payments.processEvent).not.toHaveBeenCalled();
    },
  );

  it.each([1000, 7000, 7002, 9000])(
    'keeps non-final resultCode %i processing without a failure event',
    async (resultCode) => {
      await expect(service.process(signedIpn({ resultCode }))).resolves.toEqual(
        { state: 'processing', processed: false },
      );
      expect(payments.processEvent).not.toHaveBeenCalled();
    },
  );

  it('maps a known final failure without persisting the untrusted provider message', async () => {
    await expect(
      service.process(signedIpn({ resultCode: 1006, message: 'untrusted' })),
    ).resolves.toEqual({ state: 'failed', processed: true });
    expect(payments.processEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: PaymentEventType.FAILED,
        failureCode: 'MOMO_1006',
        failureMessage: 'MoMo reported final payment failure',
      }),
    );
  });
});

function payment(): Payment {
  return {
    id: 42,
    orderId: 10,
    order: { id: 10 } as Payment['order'],
    provider: 'momo',
    providerPaymentId: ORDER_ID,
    idempotencyKey: 'payment-key-42',
    amount: 150_000,
    currency: 'VND',
    status: PaymentStatus.PROCESSING,
    failureCode: null,
    failureMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    succeededAt: null,
  };
}

function signedIpn(overrides: Partial<MomoIpnDto> = {}): MomoIpnDto {
  const input = {
    partnerCode: 'test-partner',
    orderId: ORDER_ID,
    requestId: REQUEST_ID,
    amount: 150_000,
    orderInfo: 'Payment 42',
    orderType: 'momo_wallet',
    transId: 123456,
    resultCode: 0,
    message: 'Successful.',
    payType: 'qr',
    responseTime: 1_700_000_000_000,
    extraData: '',
    ...overrides,
  };
  const canonical = buildMomoIpnCanonical({
    accessKey: 'test-access',
    ...input,
  });
  return {
    ...input,
    signature: signMomo(canonical, 'test-secret'),
  };
}
