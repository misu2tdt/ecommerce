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
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';

@Entity('product_reviews')
@Index('UQ_product_reviews_user_product', ['userId', 'productId'], {
  unique: true,
})
@Check('CHK_product_reviews_rating', '"rating" BETWEEN 1 AND 5')
export class ProductReview {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  userId!: number;

  @ManyToOne(() => User, (user) => user.productReviews, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_product_reviews_user',
  })
  user!: User;

  @Column({ type: 'int' })
  productId!: number;

  @ManyToOne(() => Product, (product) => product.reviews, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'productId',
    foreignKeyConstraintName: 'FK_product_reviews_product',
  })
  product!: Product;

  @Column({ type: 'int' })
  rating!: number;

  @Column({ type: 'varchar', length: 150, nullable: true })
  title!: string | null;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  @Column({ type: 'boolean', default: true })
  isVisible!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
