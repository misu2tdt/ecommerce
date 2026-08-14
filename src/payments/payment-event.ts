import { PaymentEventType } from './entities/payment-event-type.enum';

export interface ProviderPaymentEvent {
  provider: string;
  providerEventId: string;
  providerPaymentId: string;
  eventType: PaymentEventType;
  failureCode?: string;
  failureMessage?: string;
}
