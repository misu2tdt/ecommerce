import {
  buildMomoCreateCanonical,
  buildMomoIpnCanonical,
  signMomo,
  verifyMomoSignature,
} from './momo.signature';

describe('MoMo HMAC signatures', () => {
  it('constructs create-payment canonical fields in the documented order', () => {
    const canonical = buildMomoCreateCanonical({
      accessKey: 'test-access',
      amount: 150_000,
      extraData: '',
      ipnUrl: 'https://merchant.test/payments/webhooks/momo',
      orderId: 'momo-pay-42',
      orderInfo: 'Payment 42',
      partnerCode: 'test-partner',
      redirectUrl: 'https://merchant.test/payment-return',
      requestId: 'momo-req-42',
      requestType: 'captureWallet',
    });

    expect(canonical).toBe(
      'accessKey=test-access&amount=150000&extraData=&ipnUrl=https://merchant.test/payments/webhooks/momo&orderId=momo-pay-42&orderInfo=Payment 42&partnerCode=test-partner&redirectUrl=https://merchant.test/payment-return&requestId=momo-req-42&requestType=captureWallet',
    );
    expect(signMomo(canonical, 'test-secret')).toBe(
      'a06fb03ae70dba03ba32a4efbd12c323c2f566265f7fc2fe3871a4aee97dae5b',
    );
  });

  it('verifies IPN signatures with timing-safe fixed-length input', () => {
    const canonical = buildMomoIpnCanonical({
      accessKey: 'test-access',
      amount: 150_000,
      extraData: '',
      message: 'Successful.',
      orderId: 'momo-pay-42',
      orderInfo: 'Payment 42',
      orderType: 'momo_wallet',
      partnerCode: 'test-partner',
      payType: 'qr',
      requestId: 'momo-req-42',
      responseTime: 1_700_000_000_000,
      resultCode: 0,
      transId: 123456,
    });
    const signature = signMomo(canonical, 'test-secret');

    expect(verifyMomoSignature(canonical, signature, 'test-secret')).toBe(true);
    expect(verifyMomoSignature(canonical, 'invalid', 'test-secret')).toBe(
      false,
    );
    expect(verifyMomoSignature(canonical, '0'.repeat(64), 'test-secret')).toBe(
      false,
    );
  });
});
