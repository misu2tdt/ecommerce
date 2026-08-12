import { ConfigService } from '@nestjs/config';
import type { JwtSignOptions } from '@nestjs/jwt';

export function getRequiredConfig(
  configService: ConfigService,
  key: string,
): string {
  const value = configService.get<string>(key);

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key} must be configured`);
  }

  return value;
}

export function getDatabasePort(configService: ConfigService): number {
  const rawPort = getRequiredConfig(configService, 'DB_PORT');
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be an integer between 1 and 65535');
  }

  return port;
}

export function getJwtExpiration(
  configService: ConfigService,
): JwtSignOptions['expiresIn'] {
  const value = getRequiredConfig(configService, 'JWT_EXPIRES_IN').trim();

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
