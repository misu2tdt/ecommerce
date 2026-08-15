import { buildMomoOrderId, buildMomoRequestId } from './momo-identifiers';

describe('MoMo opaque identifiers', () => {
  const secret = 'dedicated-test-identity-secret';

  it('is stable for the same local Payment attempt', () => {
    expect(buildMomoOrderId(42, secret)).toBe(buildMomoOrderId(42, secret));
    expect(buildMomoRequestId(42, secret)).toBe(buildMomoRequestId(42, secret));
  });

  it('produces distinct order identifiers for different Payments', () => {
    expect(buildMomoOrderId(42, secret)).not.toBe(buildMomoOrderId(43, secret));
  });

  it('does not expose the raw sequential Payment ID and stays under 64 bytes', () => {
    const orderId = buildMomoOrderId(42, secret);
    const requestId = buildMomoRequestId(42, secret);

    expect(orderId).not.toBe('momo-pay-42');
    expect(orderId).not.toMatch(/-42$/);
    expect(orderId).toMatch(/^momo-pay-[A-Za-z0-9_-]{43}$/);
    expect(Buffer.byteLength(orderId, 'utf8')).toBeLessThanOrEqual(64);
    expect(Buffer.byteLength(requestId, 'utf8')).toBeLessThanOrEqual(64);
  });
});
