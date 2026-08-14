import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { addVndAmounts, multiplyVndAmount } from '../money/vnd-money';
import { OrdersService } from '../orders/orders.service';
import { ProductStatus } from '../products/entities/product-status.enum';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItem } from './entities/cart-item.entity';
import { Cart } from './entities/cart.entity';

@Injectable()
export class CartsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ordersService: OrdersService,
  ) {}

  async getCart(userId: number) {
    const cartId = await this.dataSource.transaction(async (manager) => {
      const cart = await this.getOrCreateCart(manager, userId);
      return cart.id;
    });
    return this.loadCartView(cartId, userId);
  }

  async addItem(userId: number, dto: AddCartItemDto) {
    const cartId = await this.dataSource.transaction(async (manager) => {
      const cart = await this.getOrCreateLockedCart(manager, userId);
      const variant = await manager.getRepository(ProductVariant).findOne({
        where: { id: dto.variantId },
        relations: { product: true },
      });
      if (!variant) throw new BadRequestException('Variant does not exist');
      if (!variant.isActive)
        throw new BadRequestException('Variant is inactive');
      if (variant.product.status !== ProductStatus.ACTIVE)
        throw new BadRequestException('Product is inactive');

      await manager.query(
        `INSERT INTO "cart_items" ("cartId", "variantId", "quantity") VALUES ($1, $2, $3) ON CONFLICT ("cartId", "variantId") DO UPDATE SET "quantity" = "cart_items"."quantity" + EXCLUDED."quantity", "updatedAt" = CURRENT_TIMESTAMP`,
        [cart.id, dto.variantId, dto.quantity],
      );
      return cart.id;
    });
    return this.loadCartView(cartId, userId);
  }

  async updateItem(userId: number, itemId: number, dto: UpdateCartItemDto) {
    const cartId = await this.dataSource.transaction(async (manager) => {
      const cart = await this.getOrCreateLockedCart(manager, userId);
      const item = await manager.getRepository(CartItem).findOneBy({
        id: itemId,
        cartId: cart.id,
      });
      if (!item) throw new NotFoundException('Cart item not found');
      item.quantity = dto.quantity;
      await manager.getRepository(CartItem).save(item);
      return cart.id;
    });
    return this.loadCartView(cartId, userId);
  }

  async removeItem(userId: number, itemId: number) {
    const cartId = await this.dataSource.transaction(async (manager) => {
      const cart = await this.getOrCreateLockedCart(manager, userId);
      const result = await manager.getRepository(CartItem).delete({
        id: itemId,
        cartId: cart.id,
      });
      if (!result.affected) throw new NotFoundException('Cart item not found');
      return cart.id;
    });
    return this.loadCartView(cartId, userId);
  }

  async clear(userId: number) {
    const cartId = await this.dataSource.transaction(async (manager) => {
      const cart = await this.getOrCreateLockedCart(manager, userId);
      await manager.getRepository(CartItem).delete({ cartId: cart.id });
      return cart.id;
    });
    return this.loadCartView(cartId, userId);
  }

  async checkout(userId: number, addressId: number) {
    return this.ordersService.checkoutPrepared(userId, async (manager) => {
      const cart = await this.getOrCreateLockedCart(manager, userId);
      const items = await manager.getRepository(CartItem).find({
        where: { cartId: cart.id },
        order: { variantId: 'ASC' },
      });
      if (items.length === 0)
        throw new BadRequestException('Cannot checkout an empty cart');
      const purchasedItemIds = items.map((item) => item.id);
      return {
        dto: {
          addressId,
          items: items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        },
        afterOrderSaved: async (checkoutManager) => {
          await checkoutManager
            .getRepository(CartItem)
            .delete(purchasedItemIds);
        },
      };
    });
  }

  private async getOrCreateCart(manager: EntityManager, userId: number) {
    await manager.query(
      `INSERT INTO "carts" ("userId") VALUES ($1) ON CONFLICT ("userId") DO NOTHING`,
      [userId],
    );
    return manager.getRepository(Cart).findOneByOrFail({ userId });
  }

  private async getOrCreateLockedCart(manager: EntityManager, userId: number) {
    const cart = await this.getOrCreateCart(manager, userId);
    return manager.getRepository(Cart).findOneOrFail({
      where: { id: cart.id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  private async loadCartView(cartId: number, userId: number) {
    const cart = await this.dataSource.getRepository(Cart).findOneOrFail({
      where: { id: cartId, userId },
      relations: {
        items: { variant: { product: { images: true } } },
      },
      order: { items: { id: 'ASC' } },
    });
    const items = cart.items.map((item) => {
      const variant = item.variant;
      const product = variant.product;
      const price = variant.price;
      return {
        id: item.id,
        quantity: item.quantity,
        lineTotal: multiplyVndAmount(price, item.quantity),
        available:
          product.status === ProductStatus.ACTIVE &&
          variant.isActive &&
          variant.stock >= item.quantity,
        variant: {
          id: variant.id,
          sku: variant.sku,
          name: variant.name,
          price,
          stock: variant.stock,
          attributes: variant.attributes,
          isActive: variant.isActive,
          product: {
            id: product.id,
            name: product.name,
            slug: product.slug,
            status: product.status,
            primaryImage:
              product.images?.find((image) => image.isPrimary)?.url ?? null,
          },
        },
      };
    });
    return {
      id: cart.id,
      userId: cart.userId,
      items,
      totalPrice: items.reduce(
        (total, item) => addVndAmounts(total, item.lineTotal),
        0,
      ),
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
}
