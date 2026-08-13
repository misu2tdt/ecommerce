import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_images')
@Index('UQ_product_images_primary_per_product', ['productId'], {
  unique: true,
  where: '"isPrimary" = true',
})
export class ProductImage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 2048 })
  url!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  storageKey!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  altText!: string | null;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean;

  @Column({ type: 'int' })
  productId!: number;

  @ManyToOne(() => Product, (product) => product.images, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @CreateDateColumn()
  createdAt!: Date;
}
