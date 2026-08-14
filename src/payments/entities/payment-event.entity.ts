import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  PaymentEventProcessingStatus,
  PaymentEventType,
} from './payment-event-type.enum';
import { Payment } from './payment.entity';

@Entity('payment_events')
@Index('UQ_payment_events_provider_event', ['provider', 'providerEventId'], {
  unique: true,
})
@Check('CHK_payment_events_type', `"eventType" IN ('succeeded', 'failed')`)
@Check(
  'CHK_payment_events_processing_status',
  `"processingStatus" IN ('processed', 'requires_reconciliation')`,
)
export class PaymentEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  paymentId!: number;

  @ManyToOne(() => Payment, (payment) => payment.events, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'paymentId',
    foreignKeyConstraintName: 'FK_payment_events_payment',
  })
  payment!: Payment;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({ type: 'varchar', length: 255 })
  providerEventId!: string;

  @Column({ type: 'varchar', length: 255 })
  providerPaymentId!: string;

  @Column({ type: 'varchar' })
  eventType!: PaymentEventType;

  @Column({
    type: 'varchar',
    default: PaymentEventProcessingStatus.PROCESSED,
  })
  processingStatus!: PaymentEventProcessingStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  processingMessage!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt!: Date | null;
}
