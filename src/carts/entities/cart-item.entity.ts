import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductVariant } from '../../products/entities/product-variant.entity';
import { Cart } from './cart.entity';

@Entity('cart_items')
@Index('UQ_cart_items_cart_variant', ['cartId', 'variantId'], {
  unique: true,
})
@Check('CHK_cart_items_quantity', '"quantity" >= 1')
export class CartItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  cartId!: number;

  @ManyToOne(() => Cart, (cart) => cart.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'cartId',
    foreignKeyConstraintName: 'FK_cart_items_cart',
  })
  cart!: Cart;

  @Column({ type: 'int' })
  variantId!: number;

  @ManyToOne(() => ProductVariant, (variant) => variant.cartItems, {
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({
    name: 'variantId',
    foreignKeyConstraintName: 'FK_cart_items_variant',
  })
  variant!: ProductVariant;

  @Column({ type: 'int' })
  quantity!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
