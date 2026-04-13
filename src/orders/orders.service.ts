import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
// 1. THÊM MỚI: Import bưu tá
import { TelegramService } from '../telegram/telegram.service'; 

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    // 2. THÊM MỚI: Cấp thẻ nhân viên cho bưu tá
    private telegramService: TelegramService, 
  ) {}

  async checkout(createOrderDto: CreateOrderDto) {
    const { userId, items } = createOrderDto;
    let totalPrice = 0;
    const orderItemsToSave: OrderItem[] = [];

    // 1. Duyệt qua từng món hàng khách đặt trong giỏ
    for (const item of items) {
      const product = await this.productRepo.findOne({ where: { id: item.productId } });

      if (!product) {
        throw new BadRequestException(`Sản phẩm ID ${item.productId} không tồn tại!`);
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(`Sản phẩm ${product.name} chỉ còn ${product.stock} cái, không đủ để bán!`);
      }

      // 2. Tính tiền và trừ tồn kho
      totalPrice += product.price * item.quantity;
      product.stock -= item.quantity;
      await this.productRepo.save(product); 

      // 3. Đóng gói chi tiết đơn hàng
      const orderItem = new OrderItem();
      orderItem.product = product;
      orderItem.quantity = item.quantity;
      orderItem.price = product.price; 
      
      orderItemsToSave.push(orderItem);
    }

    // 4. Tạo cái vỏ Đơn hàng tổng
    const newOrder = this.orderRepo.create({
      user: { id: userId }, 
      totalPrice: totalPrice,
      status: 'pending',
      items: orderItemsToSave, 
    });

    // 5. Lưu đơn hàng
    const savedOrder = await this.orderRepo.save(newOrder);

    // 6. THÊM MỚI: Gọi Bot Telegram đi báo tin vui
    const msg = `🚨 <b>CÓ ĐƠN HÀNG MỚI!</b>\n\n` +
                `👤 <b>Khách hàng ID:</b> ${userId}\n` +
                `💰 <b>Tổng tiền:</b> $${totalPrice}\n` +
                `📦 <b>Trạng thái:</b> ${savedOrder.status}\n` +
                `⏰ <b>Thời gian:</b> ${new Date().toLocaleString()}`;
                
    console.log('Bắt đầu gọi Bot Telegram...'); 
    this.telegramService.sendMessage(msg);

    // 7. Trả hóa đơn về cho khách
    return savedOrder;
  }
}