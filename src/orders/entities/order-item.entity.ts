import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductVariant } from '../../products/entities/product-variant.entity';
import { VND_MAX_AMOUNT, vndMoneyTransformer } from '../../money/vnd-money';
import { Order } from './order.entity';
import { Check } from 'typeorm';

@Entity('order_items')
@Check('CHK_order_items_price', `"price" >= 0 AND "price" <= ${VND_MAX_AMOUNT}`)
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'bigint', transformer: vndMoneyTransformer })
  price!: number;

  @Column({ type: 'int' })
  orderId!: number;

  @ManyToOne(() => Order, (order) => order.items)
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  @Column({ type: 'int' })
  variantId!: number;

  @ManyToOne(() => ProductVariant, (variant) => variant.orderItems, {
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({
    name: 'variantId',
    foreignKeyConstraintName: 'FK_order_items_variant',
  })
  variant!: ProductVariant;
}
