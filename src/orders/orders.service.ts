import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ProductStatus } from '../products/entities/product-status.enum';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { TelegramService } from '../telegram/telegram.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';

interface NormalizedOrderItem {
  variantId: number;
  quantity: number;
}

export interface PreparedCheckout {
  dto: CreateOrderDto;
  afterOrderSaved?: (manager: EntityManager) => Promise<void>;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    private readonly dataSource: DataSource,
    private readonly telegramService: TelegramService,
  ) {}

  async checkout(userId: number, createOrderDto: CreateOrderDto) {
    return this.checkoutPrepared(userId, async () => ({
      dto: createOrderDto,
    }));
  }

  async checkoutPrepared(
    userId: number,
    prepare: (manager: EntityManager) => Promise<PreparedCheckout>,
  ) {
    const savedOrder = await this.dataSource.transaction(async (manager) => {
      const prepared = await prepare(manager);
      const normalizedItems = this.normalizeItems(prepared.dto);
      const variantRepo = manager.getRepository(ProductVariant);
      const productRepo = manager.getRepository(Product);
      const orderRepo = manager.getRepository(Order);
      const orderItemRepo = manager.getRepository(OrderItem);
      const locked: Array<{ variant: ProductVariant; product: Product }> = [];

      for (const item of normalizedItems) {
        const variant = await variantRepo.findOne({
          where: { id: item.variantId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!variant)
          throw new BadRequestException(
            `Variant ID ${item.variantId} does not exist`,
          );
        const product = await productRepo.findOneBy({ id: variant.productId });
        if (!product)
          throw new BadRequestException('Variant Product does not exist');
        locked.push({ variant, product });
      }

      for (const { variant, product } of locked) {
        if (!variant.isActive)
          throw new BadRequestException(`Variant ${variant.name} is inactive`);
        if (product.status === ProductStatus.INACTIVE)
          throw new BadRequestException(`Product ${product.name} is inactive`);
      }
      for (let index = 0; index < normalizedItems.length; index += 1) {
        if (locked[index].variant.stock < normalizedItems[index].quantity) {
          throw new BadRequestException(
            `Variant ${locked[index].variant.name} has insufficient stock`,
          );
        }
      }

      let totalPrice = 0;
      const items: OrderItem[] = [];
      for (let index = 0; index < normalizedItems.length; index += 1) {
        const requested = normalizedItems[index];
        const variant = locked[index].variant;
        totalPrice += Number(variant.price) * requested.quantity;
        variant.stock -= requested.quantity;
        await variantRepo.save(variant);
        items.push(
          orderItemRepo.create({
            variant,
            variantId: variant.id,
            quantity: requested.quantity,
            price: variant.price,
          }),
        );
      }

      const order = await orderRepo.save(
        orderRepo.create({
          user: { id: userId },
          totalPrice,
          status: 'pending',
          items,
        }),
      );
      await prepared.afterOrderSaved?.(manager);
      return order;
    });

    const message = `New order for user ${userId}; total $${savedOrder.totalPrice}; status ${savedOrder.status}`;
    void this.telegramService
      .sendMessage(message)
      .catch(() => this.logger.error('Unable to send order notification'));
    return savedOrder;
  }

  private normalizeItems(dto: CreateOrderDto): NormalizedOrderItem[] {
    const quantities = new Map<number, number>();
    for (const item of dto.items)
      quantities.set(
        item.variantId,
        (quantities.get(item.variantId) ?? 0) + item.quantity,
      );
    return [...quantities.entries()]
      .sort(([first], [second]) => first - second)
      .map(([variantId, quantity]) => ({ variantId, quantity }));
  }
}
