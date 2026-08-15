import { parseVndAmount } from '../../money/vnd-money';
import { PaymentStatus } from '../entities/payment-status.enum';
import {
  CreateProviderPaymentInput,
  CreateProviderPaymentResult,
  PaymentProvider,
} from '../payment-provider';
import {
  PaymentProviderAmbiguousError,
  PaymentProviderRejectedError,
} from '../provider-errors';
import { MomoConfig } from './momo.config';
import {
  MOMO_CREATE_PATH,
  MOMO_MAX_AMOUNT,
  MOMO_MIN_AMOUNT,
  MOMO_PROVIDER,
} from './momo.constants';
import { MomoHttpClient } from './momo-http.client';
import { buildMomoOrderId, buildMomoRequestId } from './momo-identifiers';
import { buildMomoCreateCanonical, signMomo } from './momo.signature';

interface MomoCreateResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  resultCode: number;
  payUrl: string;
  deeplink?: string;
  qrCodeUrl?: string;
}

export class MomoPaymentProvider extends PaymentProvider {
  readonly provider = MOMO_PROVIDER;

  constructor(
    private readonly config: MomoConfig,
    private readonly httpClient: MomoHttpClient,
  ) {
    super();
  }

  getProviderPaymentId(paymentId: number): string {
    return buildMomoOrderId(paymentId, this.config.identitySecret);
  }

  getRequestId(paymentId: number): string {
    return buildMomoRequestId(paymentId, this.config.identitySecret);
  }

  async createPayment(
    input: CreateProviderPaymentInput,
  ): Promise<CreateProviderPaymentResult> {
    const amount = parseVndAmount(input.amount);
    if (
      input.currency !== 'VND' ||
      amount < MOMO_MIN_AMOUNT ||
      amount > MOMO_MAX_AMOUNT
    )
      throw new PaymentProviderRejectedError(
        `MoMo captureWallet amount must be between ${MOMO_MIN_AMOUNT} and ${MOMO_MAX_AMOUNT} VND`,
      );

    const orderId = this.getProviderPaymentId(input.paymentId);
    const requestId = this.getRequestId(input.paymentId);
    const orderInfo = `Payment ${input.paymentId}`;
    const requestType = 'captureWallet';
    const extraData = '';
    const canonical = buildMomoCreateCanonical({
      accessKey: this.config.accessKey,
      amount,
      extraData,
      ipnUrl: this.config.ipnUrl,
      orderId,
      orderInfo,
      partnerCode: this.config.partnerCode,
      redirectUrl: this.config.redirectUrl,
      requestId,
      requestType,
    });
    const body = {
      partnerCode: this.config.partnerCode,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: this.config.redirectUrl,
      ipnUrl: this.config.ipnUrl,
      requestType,
      extraData,
      lang: 'vi',
      signature: signMomo(canonical, this.config.secretKey),
    };
    const raw = await this.httpClient.postJson(
      `${this.config.endpoint}${MOMO_CREATE_PATH}`,
      body,
      this.config.timeoutMs,
    );
    const response = this.parseCreateResponse(raw);
    if (response.resultCode !== 0)
      throw new PaymentProviderRejectedError('MoMo rejected create-payment');
    if (
      response.partnerCode !== this.config.partnerCode ||
      response.orderId !== orderId ||
      response.requestId !== requestId ||
      response.amount !== amount
    )
      throw new PaymentProviderAmbiguousError(
        'MoMo create-payment response did not match the request',
      );

    return {
      providerPaymentId: orderId,
      initialStatus: PaymentStatus.PROCESSING,
      checkoutUrl: requireHttpUrl(response.payUrl, 'payUrl'),
      clientData: compactClientData(response),
    };
  }

  private parseCreateResponse(value: unknown): MomoCreateResponse {
    if (!isRecord(value))
      throw new PaymentProviderAmbiguousError(
        'MoMo create-payment response was invalid',
      );
    const requiredStrings = ['partnerCode', 'orderId', 'requestId', 'payUrl'];
    if (
      requiredStrings.some((key) => typeof value[key] !== 'string') ||
      !Number.isSafeInteger(value.amount) ||
      !Number.isInteger(value.resultCode)
    )
      throw new PaymentProviderAmbiguousError(
        'MoMo create-payment response was invalid',
      );
    return value as unknown as MomoCreateResponse;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireHttpUrl(value: string, field: string): string {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new PaymentProviderAmbiguousError(`MoMo ${field} was invalid`);
  }
}

function compactClientData(response: MomoCreateResponse) {
  const data: Record<string, string> = {};
  if (typeof response.deeplink === 'string') {
    const deeplink = optionalContinuationUrl(response.deeplink);
    if (deeplink) data.deeplink = deeplink;
  }
  if (typeof response.qrCodeUrl === 'string')
    data.qrCodeUrl = response.qrCodeUrl.slice(0, 4096);
  return Object.keys(data).length > 0 ? data : undefined;
}

function optionalContinuationUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:', 'momo:'].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    return null;
  }
}
