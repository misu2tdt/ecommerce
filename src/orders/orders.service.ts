import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
  ) {}

  async checkout(createOrderDto: CreateOrderDto) {
    const { userId, items } = createOrderDto;
    let totalPrice = 0;
    const orderItemsToSave: OrderItem[] = [];

    // 1. Duyệt qua từng món hàng khách đặt trong giỏ
    for (const item of items) {
      // Tìm hàng trong kho
      const product = await this.productRepo.findOne({ where: { id: item.productId } });

      if (!product) {
        throw new BadRequestException(`Sản phẩm ID ${item.productId} không tồn tại!`);
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(`Sản phẩm ${product.name} chỉ còn ${product.stock} cái, không đủ để bán!`);
      }

      // 2. Tính tiền bằng giá GỐC TRONG KHO và trừ số lượng tồn kho
      totalPrice += product.price * item.quantity;
      product.stock -= item.quantity;
      await this.productRepo.save(product); // Cập nhật lại kho hàng ngay lập tức

      // 3. Đóng gói chi tiết đơn hàng
      const orderItem = new OrderItem();
      orderItem.product = product;
      orderItem.quantity = item.quantity;
      orderItem.price = product.price; // Chốt giá tại thời điểm mua (mặc kệ sau này có lạm phát)
      
      orderItemsToSave.push(orderItem);
    }

    // 4. Tạo cái vỏ Đơn hàng tổng
    const newOrder = this.orderRepo.create({
      user: { id: userId }, // Nối vào user đang mua
      totalPrice: totalPrice,
      status: 'pending',
      items: orderItemsToSave, // Gắn mảng chi tiết vào. Nhờ có cascade: true lúc nãy thiết kế, TypeORM sẽ tự lưu đống này!
    });

    // 5. Lưu đơn hàng
    return await this.orderRepo.save(newOrder);
  }
}