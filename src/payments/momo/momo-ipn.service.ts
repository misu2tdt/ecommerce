import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaymentEventType } from '../entities/payment-event-type.enum';
import { Payment } from '../entities/payment.entity';
import { PaymentsService } from '../payments.service';
import { MomoIpnDto } from './dto/momo-ipn.dto';
import type { MomoConfig } from './momo.config';
import {
  MOMO_CONFIG,
  MOMO_FINAL_FAILURE_RESULT_CODES,
  MOMO_PENDING_RESULT_CODES,
  MOMO_PROVIDER,
} from './momo.constants';
import { buildMomoIpnCanonical, verifyMomoSignature } from './momo.signature';
import { buildMomoOrderId, buildMomoRequestId } from './momo-identifiers';

@Injectable()
export class MomoIpnService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly paymentsService: PaymentsService,
    @Inject(MOMO_CONFIG) private readonly config: MomoConfig,
  ) {}

  async process(input: MomoIpnDto) {
    const canonical = buildMomoIpnCanonical({
      accessKey: this.config.accessKey,
      amount: input.amount,
      extraData: input.extraData,
      message: input.message,
      orderId: input.orderId,
      orderInfo: input.orderInfo,
      orderType: input.orderType,
      partnerCode: input.partnerCode,
      payType: input.payType,
      requestId: input.requestId,
      responseTime: input.responseTime,
      resultCode: input.resultCode,
      transId: input.transId,
    });
    if (!verifyMomoSignature(canonical, input.signature, this.config.secretKey))
      throw new UnauthorizedException('Invalid MoMo signature');
    if (input.partnerCode !== this.config.partnerCode)
      throw new BadRequestException('MoMo partner mismatch');

    const payment = await this.dataSource.getRepository(Payment).findOneBy({
      provider: MOMO_PROVIDER,
      providerPaymentId: input.orderId,
    });
    if (!payment) throw new NotFoundException('Payment not found');
    const expectedOrderId = buildMomoOrderId(
      payment.id,
      this.config.identitySecret,
    );
    const expectedRequestId = buildMomoRequestId(
      payment.id,
      this.config.identitySecret,
    );
    if (
      payment.providerPaymentId !== expectedOrderId ||
      input.orderId !== expectedOrderId
    )
      throw new BadRequestException('MoMo order mapping mismatch');
    if (input.requestId !== expectedRequestId)
      throw new BadRequestException('MoMo request mapping mismatch');
    if (input.amount !== payment.amount)
      throw new BadRequestException('MoMo amount mismatch');

    if (MOMO_PENDING_RESULT_CODES.has(input.resultCode))
      return { state: 'processing' as const, processed: false };
    let eventType: PaymentEventType;
    if (input.resultCode === 0) eventType = PaymentEventType.SUCCEEDED;
    else if (MOMO_FINAL_FAILURE_RESULT_CODES.has(input.resultCode))
      eventType = PaymentEventType.FAILED;
    else throw new BadRequestException('Unsupported MoMo result code');

    const result = await this.paymentsService.processEvent({
      provider: MOMO_PROVIDER,
      providerEventId: buildProviderEventId(input),
      providerPaymentId: expectedOrderId,
      eventType,
      ...(eventType === PaymentEventType.FAILED
        ? {
            failureCode: `MOMO_${input.resultCode}`,
            failureMessage: 'MoMo reported final payment failure',
          }
        : {}),
    });
    return {
      state:
        eventType === PaymentEventType.SUCCEEDED
          ? ('succeeded' as const)
          : ('failed' as const),
      processed: !result.duplicate,
    };
  }
}

function buildProviderEventId(input: MomoIpnDto): string {
  return `${input.orderId}:${input.transId}:${input.resultCode}`;
}
