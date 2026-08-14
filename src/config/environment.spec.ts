import { getPaymentCurrency } from './environment';

describe('payment currency configuration', () => {
  it('defaults to and normalizes VND', () => {
    expect(getPaymentCurrency(() => undefined)).toBe('VND');
    expect(getPaymentCurrency(() => ' vnd ')).toBe('VND');
  });

  it('rejects unsupported currency instead of retaining a USD fallback', () => {
    expect(() => getPaymentCurrency(() => 'USD')).toThrow(
      'PAYMENT_CURRENCY must be VND',
    );
  });
});
