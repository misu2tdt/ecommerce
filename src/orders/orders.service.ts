import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { ProductStatus } from '../products/entities/product-status.enum';
import { TelegramService } from '../telegram/telegram.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';

interface NormalizedOrderItem {
  productId: number;
  quantity: number;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly telegramService: TelegramService,
  ) {}

  async checkout(userId: number, createOrderDto: CreateOrderDto) {
    const normalizedItems = this.normalizeItems(createOrderDto);

    const savedOrder = await this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const orderRepo = manager.getRepository(Order);
      const orderItemRepo = manager.getRepository(OrderItem);
      const lockedProducts: Product[] = [];
      let totalPrice = 0;
      const orderItemsToSave: OrderItem[] = [];

      for (const item of normalizedItems) {
        const product = await productRepo.findOne({
          where: { id: item.productId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!product) {
          throw new BadRequestException(
            `Sản phẩm ID ${item.productId} không tồn tại!`,
          );
        }

        lockedProducts.push(product);
      }

      for (const product of lockedProducts) {
        if (product.status === ProductStatus.INACTIVE) {
          throw new BadRequestException(
            `Sản phẩm ${product.name} hiện không được bán!`,
          );
        }
      }

      for (let index = 0; index < normalizedItems.length; index += 1) {
        const item = normalizedItems[index];
        const product = lockedProducts[index];

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm ${product.name} chỉ còn ${product.stock} cái, không đủ để bán!`,
          );
        }
      }

      for (let index = 0; index < normalizedItems.length; index += 1) {
        const item = normalizedItems[index];
        const product = lockedProducts[index];

        totalPrice += product.price * item.quantity;
        product.stock -= item.quantity;
        await productRepo.save(product);

        orderItemsToSave.push(
          orderItemRepo.create({
            product,
            quantity: item.quantity,
            price: product.price,
          }),
        );
      }

      const order = orderRepo.create({
        user: { id: userId },
        totalPrice,
        status: 'pending',
        items: orderItemsToSave,
      });

      return orderRepo.save(order);
    });

    const message =
      `🚨 <b>CÓ ĐƠN HÀNG MỚI!</b>\n\n` +
      `👤 <b>Khách hàng ID:</b> ${userId}\n` +
      `💰 <b>Tổng tiền:</b> $${savedOrder.totalPrice}\n` +
      `📦 <b>Trạng thái:</b> ${savedOrder.status}\n` +
      `⏰ <b>Thời gian:</b> ${new Date().toLocaleString()}`;

    void this.telegramService.sendMessage(message).catch(() => {
      this.logger.error('Không thể gửi thông báo đơn hàng qua Telegram');
    });

    return savedOrder;
  }

  private normalizeItems(
    createOrderDto: CreateOrderDto,
  ): NormalizedOrderItem[] {
    const quantitiesByProductId = new Map<number, number>();

    for (const item of createOrderDto.items) {
      quantitiesByProductId.set(
        item.productId,
        (quantitiesByProductId.get(item.productId) ?? 0) + item.quantity,
      );
    }

    return [...quantitiesByProductId.entries()]
      .sort(([firstId], [secondId]) => firstId - secondId)
      .map(([productId, quantity]) => ({ productId, quantity }));
  }
}
