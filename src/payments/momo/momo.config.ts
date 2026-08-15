import type { ConfigReader } from '../../config/environment';
import { getRequiredConfig } from '../../config/environment';
import { MOMO_CREATE_TIMEOUT_MS } from './momo.constants';

export interface MomoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  identitySecret: string;
  endpoint: string;
  redirectUrl: string;
  ipnUrl: string;
  timeoutMs: number;
}

export function getMomoConfig(reader: ConfigReader): MomoConfig {
  const endpoint = normalizeUrl(
    getRequiredConfig(reader, 'MOMO_ENDPOINT'),
    'MOMO_ENDPOINT',
  ).replace(/\/$/, '');
  return {
    partnerCode: getRequiredConfig(reader, 'MOMO_PARTNER_CODE').trim(),
    accessKey: getRequiredConfig(reader, 'MOMO_ACCESS_KEY').trim(),
    secretKey: getRequiredConfig(reader, 'MOMO_SECRET_KEY').trim(),
    identitySecret: getRequiredConfig(reader, 'MOMO_IDENTITY_SECRET').trim(),
    endpoint,
    redirectUrl: normalizeUrl(
      getRequiredConfig(reader, 'MOMO_REDIRECT_URL'),
      'MOMO_REDIRECT_URL',
    ),
    ipnUrl: normalizeUrl(
      getRequiredConfig(reader, 'MOMO_IPN_URL'),
      'MOMO_IPN_URL',
    ),
    timeoutMs: MOMO_CREATE_TIMEOUT_MS,
  };
}

function normalizeUrl(value: string, key: string): string {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new Error(`${key} must be a valid HTTP(S) URL`);
  }
}
