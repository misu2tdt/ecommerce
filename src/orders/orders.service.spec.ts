import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ProductStatus } from '../products/entities/product-status.enum';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { TelegramService } from '../telegram/telegram.service';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';

describe('OrdersService variant checkout', () => {
  const variantRepo = { findOne: jest.fn(), save: jest.fn() };
  const productRepo = { findOneBy: jest.fn() };
  const orderRepo = { create: jest.fn(), save: jest.fn() };
  const orderItemRepo = { create: jest.fn() };
  const manager = {
    getRepository: jest.fn((entity) => {
      if (entity === ProductVariant) return variantRepo;
      if (entity === Product) return productRepo;
      if (entity === Order) return orderRepo;
      if (entity === OrderItem) return orderItemRepo;
    }),
  };
  const dataSource = {
    transaction: jest.fn((work: (manager: EntityManager) => unknown) =>
      work(manager as unknown as EntityManager),
    ),
  };
  const telegram = { sendMessage: jest.fn() };
  let service: OrdersService;

  beforeEach(() => {
    jest.clearAllMocks();
    variantRepo.save.mockImplementation(async (value) => value);
    productRepo.findOneBy.mockResolvedValue(product());
    orderItemRepo.create.mockImplementation((value) => value);
    orderRepo.create.mockImplementation((value) => value);
    orderRepo.save.mockResolvedValue({
      id: 1,
      totalPrice: 30,
      status: 'pending',
    });
    telegram.sendMessage.mockResolvedValue(undefined);
    service = new OrdersService(
      dataSource as unknown as DataSource,
      telegram as unknown as TelegramService,
    );
  });

  it('aggregates duplicates, locks once, snapshots price and decrements stock', async () => {
    const selected = variant({ id: 5, stock: 5, price: 10 });
    variantRepo.findOne.mockResolvedValue(selected);
    await service.checkout(7, {
      items: [
        { variantId: 5, quantity: 1 },
        { variantId: 5, quantity: 2 },
      ],
    });
    expect(variantRepo.findOne).toHaveBeenCalledTimes(1);
    expect(variantRepo.findOne).toHaveBeenCalledWith({
      where: { id: 5 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(selected.stock).toBe(2);
    expect(orderItemRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: selected,
        variantId: 5,
        quantity: 3,
        price: 10,
      }),
    );
  });

  it('locks unique variant IDs in ascending order', async () => {
    variantRepo.findOne.mockImplementation(async ({ where }) =>
      variant({ id: where.id }),
    );
    await service.checkout(7, {
      items: [
        { variantId: 5, quantity: 1 },
        { variantId: 2, quantity: 1 },
      ],
    });
    expect(
      variantRepo.findOne.mock.calls.map(([value]) => value.where.id),
    ).toEqual([2, 5]);
  });

  it.each([
    ['missing', null, product(), 1],
    ['inactive variant', variant({ isActive: false }), product(), 1],
    [
      'inactive Product',
      variant(),
      product({ status: ProductStatus.INACTIVE }),
      1,
    ],
    ['insufficient stock', variant({ stock: 1 }), product(), 2],
  ])('rejects %s before writes', async (_label, selected, owner, quantity) => {
    variantRepo.findOne.mockResolvedValue(selected);
    productRepo.findOneBy.mockResolvedValue(owner);
    await expect(
      service.checkout(7, { items: [{ variantId: 1, quantity }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(variantRepo.save).not.toHaveBeenCalled();
    expect(orderRepo.save).not.toHaveBeenCalled();
  });
});

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 10,
    name: 'Product',
    slug: 'product',
    description: null,
    status: ProductStatus.ACTIVE,
    categoryId: 1,
    category: { id: 1 } as Product['category'],
    brandId: null,
    brand: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function variant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: 1,
    productId: 10,
    product: product(),
    sku: 'SKU-1',
    name: 'Default',
    price: 10,
    stock: 5,
    attributes: {},
    isActive: true,
    position: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
