import { createHmac } from 'node:crypto';

const ORDER_ID_PREFIX = 'momo-pay-';
const REQUEST_ID_PREFIX = 'momo-req-';

export function buildMomoOrderId(
  paymentId: number,
  identitySecret: string,
): string {
  return `${ORDER_ID_PREFIX}${buildOpaqueToken('order', paymentId, identitySecret)}`;
}

export function buildMomoRequestId(
  paymentId: number,
  identitySecret: string,
): string {
  return `${REQUEST_ID_PREFIX}${buildOpaqueToken('request', paymentId, identitySecret)}`;
}

function buildOpaqueToken(
  purpose: 'order' | 'request',
  paymentId: number,
  identitySecret: string,
): string {
  if (!Number.isSafeInteger(paymentId) || paymentId < 1)
    throw new RangeError('paymentId must be a positive safe integer');
  if (identitySecret.length === 0)
    throw new Error('MoMo identity secret must not be empty');

  return createHmac('sha256', identitySecret)
    .update(`momo:${purpose}:${paymentId}`)
    .digest('base64url');
}
