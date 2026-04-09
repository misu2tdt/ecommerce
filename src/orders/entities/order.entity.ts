import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice!: number;

  @Column({ type: 'varchar', default: 'pending' }) // pending (chờ duyệt), shipping (đang giao), completed (hoàn thành)
  status!: string;

  // MỐI QUAN HỆ: Nhiều Đơn hàng thuộc về 1 Người dùng (N-1)
  @ManyToOne(() => User)
  user!: User;

  // MỐI QUAN HỆ: 1 Đơn hàng có Nhiều Chi tiết đơn hàng (1-N)
  // cascade: true nghĩa là khi em lưu Đơn hàng, nó sẽ tự động lưu luôn các Chi tiết bên trong mà không cần gọi lệnh 2 lần.
  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
  items!: OrderItem[];

  @CreateDateColumn()
  createdAt!: Date;
}