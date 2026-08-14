export enum PaymentEventType {
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}

export enum PaymentEventProcessingStatus {
  PROCESSED = 'processed',
  REQUIRES_RECONCILIATION = 'requires_reconciliation',
}
