import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true }) // nullable: true nghĩa là cho phép bỏ trống (không phải sản phẩm nào cũng cần mô tả)
  description!: string;

  // precision: 10 (10 chữ số), scale: 2 (2 chữ số phần thập phân)
  @Column({ type: 'decimal', precision: 10, scale: 2 }) 
  price!: number;

  @Column({ type: 'int', default: 0 }) // Tồn kho mặc định là 0, hết hàng!
  stock!: number;

  @CreateDateColumn()
  createdAt!: Date;
}