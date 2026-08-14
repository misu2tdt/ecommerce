import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { getPaymentCurrency } from '../config/environment';
import { Order } from '../orders/entities/order.entity';
import { PaymentEvent } from './entities/payment-event.entity';
import { Payment } from './entities/payment.entity';
import { FakePaymentProvider } from './fake-payment.provider';
import { PaymentProvider } from './payment-provider';
import {
  DEFAULT_PAYMENT_CURRENCY,
  PAYMENT_CURRENCY,
} from './payments.constants';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentEvent, Order]),
    AuthModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    FakePaymentProvider,
    { provide: PaymentProvider, useExisting: FakePaymentProvider },
    {
      provide: PAYMENT_CURRENCY,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getPaymentCurrency(
          (key) => configService.get(key),
          DEFAULT_PAYMENT_CURRENCY,
        ),
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
