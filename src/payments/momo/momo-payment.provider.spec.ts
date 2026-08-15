import { PaymentStatus } from '../entities/payment-status.enum';
import {
  PaymentProviderAmbiguousError,
  PaymentProviderRejectedError,
} from '../provider-errors';
import type { MomoConfig } from './momo.config';
import { MOMO_CREATE_PATH } from './momo.constants';
import { MomoHttpClient } from './momo-http.client';
import { MomoPaymentProvider } from './momo-payment.provider';

describe('MomoPaymentProvider', () => {
  const config: MomoConfig = {
    partnerCode: 'test-partner',
    accessKey: 'test-access',
    secretKey: 'test-secret',
    identitySecret: 'test-identity-secret',
    endpoint: 'https://test-payment.momo.vn',
    redirectUrl: 'https://merchant.test/payment-return',
    ipnUrl: 'https://merchant.test/payments/webhooks/momo',
    timeoutMs: 30_000,
  };
  const http = { postJson: jest.fn() };
  let provider: MomoPaymentProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new MomoPaymentProvider(
      config,
      http as unknown as MomoHttpClient,
    );
  });

  it('passes integer VND unchanged with stable identifiers and returns continuation data', async () => {
    mockSuccessfulResponse();

    const first = await provider.createPayment(input());
    const second = await provider.createPayment(input());
    const orderId = provider.getProviderPaymentId(42);
    const requestId = provider.getRequestId(42);

    expect(first).toEqual({
      providerPaymentId: orderId,
      initialStatus: PaymentStatus.PROCESSING,
      checkoutUrl: 'https://test-payment.momo.vn/pay/42',
      clientData: {
        deeplink: 'momo://payment/42',
        qrCodeUrl: 'qr-payload',
      },
    });
    expect(second.providerPaymentId).toBe(first.providerPaymentId);
    expect(http.postJson).toHaveBeenCalledWith(
      `https://test-payment.momo.vn${MOMO_CREATE_PATH}`,
      expect.objectContaining({
        amount: 150_000,
        orderId,
        requestId,
        requestType: 'captureWallet',
        signature: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      30_000,
    );
  });

  it('never rounds, converts, multiplies or divides the amount', async () => {
    await expect(
      provider.createPayment(input({ amount: 150_000.5 })),
    ).rejects.toBeInstanceOf(RangeError);
    await expect(
      provider.createPayment(input({ currency: 'USD' })),
    ).rejects.toBeInstanceOf(PaymentProviderRejectedError);
    expect(http.postJson).not.toHaveBeenCalled();
  });

  it.each([999, 50_000_001])(
    'rejects out-of-range amount %i before the provider call',
    async (amount) => {
      await expect(
        provider.createPayment(input({ amount })),
      ).rejects.toBeInstanceOf(PaymentProviderRejectedError);
      expect(http.postJson).not.toHaveBeenCalled();
    },
  );

  it.each([1_000, 50_000_000])(
    'accepts inclusive boundary amount %i unchanged',
    async (amount) => {
      mockSuccessfulResponse();

      await expect(provider.createPayment(input({ amount }))).resolves.toEqual(
        expect.objectContaining({ providerPaymentId: expect.any(String) }),
      );
      expect(http.postJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ amount }),
        expect.any(Number),
      );
    },
  );

  it('propagates an ambiguous timeout without fabricating a provider result', async () => {
    http.postJson.mockRejectedValue(
      new PaymentProviderAmbiguousError('outcome unknown'),
    );
    await expect(provider.createPayment(input())).rejects.toBeInstanceOf(
      PaymentProviderAmbiguousError,
    );
  });

  it('treats malformed successful responses as ambiguous and reconcilable', async () => {
    http.postJson.mockResolvedValue({ resultCode: 0 });
    await expect(provider.createPayment(input())).rejects.toBeInstanceOf(
      PaymentProviderAmbiguousError,
    );
  });

  function mockSuccessfulResponse(): void {
    http.postJson.mockImplementation(
      (_url: string, body: Record<string, unknown>) =>
        Promise.resolve({
          partnerCode: body.partnerCode,
          orderId: body.orderId,
          requestId: body.requestId,
          amount: body.amount,
          resultCode: 0,
          payUrl: 'https://test-payment.momo.vn/pay/42',
          deeplink: 'momo://payment/42',
          qrCodeUrl: 'qr-payload',
        }),
    );
  }
});

function input(overrides: Record<string, unknown> = {}) {
  return {
    paymentId: 42,
    orderId: 10,
    amount: 150_000,
    currency: 'VND',
    idempotencyKey: 'payment-key-42',
    ...overrides,
  } as Parameters<MomoPaymentProvider['createPayment']>[0];
}
