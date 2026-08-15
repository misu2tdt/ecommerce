import { createHmac, timingSafeEqual } from 'node:crypto';

export interface MomoCreateSignatureFields {
  accessKey: string;
  amount: number;
  extraData: string;
  ipnUrl: string;
  orderId: string;
  orderInfo: string;
  partnerCode: string;
  redirectUrl: string;
  requestId: string;
  requestType: string;
}

export interface MomoIpnSignatureFields {
  accessKey: string;
  amount: number;
  extraData: string;
  message: string;
  orderId: string;
  orderInfo: string;
  orderType: string;
  partnerCode: string;
  payType: string;
  requestId: string;
  responseTime: number;
  resultCode: number;
  transId: number;
}

export function buildMomoCreateCanonical(
  fields: MomoCreateSignatureFields,
): string {
  return [
    `accessKey=${fields.accessKey}`,
    `amount=${fields.amount}`,
    `extraData=${fields.extraData}`,
    `ipnUrl=${fields.ipnUrl}`,
    `orderId=${fields.orderId}`,
    `orderInfo=${fields.orderInfo}`,
    `partnerCode=${fields.partnerCode}`,
    `redirectUrl=${fields.redirectUrl}`,
    `requestId=${fields.requestId}`,
    `requestType=${fields.requestType}`,
  ].join('&');
}

export function buildMomoIpnCanonical(fields: MomoIpnSignatureFields): string {
  return [
    `accessKey=${fields.accessKey}`,
    `amount=${fields.amount}`,
    `extraData=${fields.extraData}`,
    `message=${fields.message}`,
    `orderId=${fields.orderId}`,
    `orderInfo=${fields.orderInfo}`,
    `orderType=${fields.orderType}`,
    `partnerCode=${fields.partnerCode}`,
    `payType=${fields.payType}`,
    `requestId=${fields.requestId}`,
    `responseTime=${fields.responseTime}`,
    `resultCode=${fields.resultCode}`,
    `transId=${fields.transId}`,
  ].join('&');
}

export function signMomo(canonical: string, secretKey: string): string {
  return createHmac('sha256', secretKey).update(canonical).digest('hex');
}

export function verifyMomoSignature(
  canonical: string,
  signature: string,
  secretKey: string,
): boolean {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(signMomo(canonical, secretKey), 'hex');
  const received = Buffer.from(signature, 'hex');
  return timingSafeEqual(expected, received);
}
