import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';

@Entity('wishlist_items')
@Index('UQ_wishlist_items_user_product', ['userId', 'productId'], {
  unique: true,
})
export class WishlistItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  userId!: number;

  @ManyToOne(() => User, (user) => user.wishlistItems, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_wishlist_items_user',
  })
  user!: User;

  @Column({ type: 'int' })
  productId!: number;

  @ManyToOne(() => Product, (product) => product.wishlistItems, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'productId',
    foreignKeyConstraintName: 'FK_wishlist_items_product',
  })
  product!: Product;

  @CreateDateColumn()
  createdAt!: Date;
}
