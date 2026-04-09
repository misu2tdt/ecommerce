import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  quantity!: number;

  // LƯU Ý KINH NGHIỆM: Phải lưu giá tiền tại THỜI ĐIỂM MUA. 
  // Tránh trường hợp tháng sau tăng giá thì hóa đơn cũ của khách bị đổi giá theo.
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number; 

  // MỐI QUAN HỆ: Nhiều Chi tiết đơn hàng cùng trỏ về 1 Đơn hàng
  @ManyToOne(() => Order, (order) => order.items)
  order!: Order;

  // MỐI QUAN HỆ: Nhiều Chi tiết đơn hàng có thể chứa cùng 1 Sản phẩm
  @ManyToOne(() => Product)
  product!: Product;
}