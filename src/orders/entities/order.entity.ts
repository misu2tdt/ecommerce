import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { VND_MAX_AMOUNT, vndMoneyTransformer } from '../../money/vnd-money';
import type { ShippingAddressSnapshot } from '../shipping-address';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from './order-status.enum';
import { Payment } from '../../payments/entities/payment.entity';

@Entity('orders')
@Check(
  'CHK_orders_status',
  `"status" IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')`,
)
@Check(
  'CHK_orders_total_price',
  `"totalPrice" >= 0 AND "totalPrice" <= ${VND_MAX_AMOUNT}`,
)
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint', transformer: vndMoneyTransformer })
  totalPrice!: number;

  @Column({ type: 'varchar', default: OrderStatus.PENDING })
  status!: OrderStatus;

  @Column({ type: 'jsonb' })
  shippingAddress!: ShippingAddressSnapshot;

  @Column({ type: 'int' })
  userId!: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
  items!: OrderItem[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments?: Payment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
