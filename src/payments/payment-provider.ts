import { PaymentStatus } from './entities/payment-status.enum';

export const FAKE_PAYMENT_PROVIDER = 'fake';

export interface CreateProviderPaymentInput {
  paymentId: number;
  orderId: number;
  amount: number;
  currency: string;
  idempotencyKey: string;
}

export interface CreateProviderPaymentResult {
  providerPaymentId: string;
  initialStatus: PaymentStatus.PROCESSING;
  checkoutUrl?: string;
  clientData?: Record<string, string>;
}

export abstract class PaymentProvider {
  abstract readonly provider: string;
  abstract getProviderPaymentId(paymentId: number): string;
  abstract createPayment(
    input: CreateProviderPaymentInput,
  ): Promise<CreateProviderPaymentResult>;
}
