import type { JwtSignOptions } from '@nestjs/jwt';

export type ConfigReader = (key: string) => unknown;

export function getRequiredConfig(reader: ConfigReader, key: string): string {
  const value = reader(key);

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key} must be configured`);
  }

  return value;
}

export function getDatabasePort(reader: ConfigReader): number {
  const rawPort = getRequiredConfig(reader, 'DB_PORT');
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be an integer between 1 and 65535');
  }

  return port;
}

export function getJwtExpiration(
  reader: ConfigReader,
): JwtSignOptions['expiresIn'] {
  const value = getRequiredConfig(reader, 'JWT_EXPIRES_IN').trim();

  if (/^\d+$/.test(value)) {
    const seconds = Number(value);
    if (Number.isSafeInteger(seconds) && seconds > 0) {
      return seconds;
    }
  }

  if (/^[1-9]\d*(?:\.\d+)?(?:ms|s|m|h|d|w|y)$/i.test(value)) {
    return value as JwtSignOptions['expiresIn'];
  }

  throw new Error(
    'JWT_EXPIRES_IN must be positive seconds or a duration such as 15m',
  );
}

export function getPaymentCurrency(
  reader: ConfigReader,
  fallback = 'USD',
): string {
  const configured = reader('PAYMENT_CURRENCY');
  const currency =
    typeof configured === 'string' && configured.trim().length > 0
      ? configured.trim().toUpperCase()
      : fallback;
  if (!/^[A-Z]{3}$/.test(currency))
    throw new Error('PAYMENT_CURRENCY must be a 3-letter currency code');
  return currency;
}
