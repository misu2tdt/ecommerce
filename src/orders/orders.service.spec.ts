import { BadRequestException, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { TelegramService } from '../telegram/telegram.service';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  const productRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const orderRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };
  const orderItemRepo = {
    create: jest.fn(),
  };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Product) return productRepo;
      if (entity === Order) return orderRepo;
      if (entity === OrderItem) return orderItemRepo;
      throw new Error('Unexpected repository');
    }),
  };
  const dataSource = {
    transaction: jest.fn(
      async (callback: (entityManager: EntityManager) => Promise<Order>) =>
        callback(manager as unknown as EntityManager),
    ),
  };
  const telegramService = {
    sendMessage: jest.fn(),
  };

  let service: OrdersService;

  beforeEach(() => {
    jest.clearAllMocks();
    telegramService.sendMessage.mockResolvedValue(undefined);
    productRepo.save.mockImplementation(async (product: Product) => product);
    orderItemRepo.create.mockImplementation(
      (input: Partial<OrderItem>) => input as OrderItem,
    );
    orderRepo.create.mockImplementation(
      (input: Partial<Order>) => input as Order,
    );
    service = new OrdersService(
      dataSource as unknown as DataSource,
      telegramService as unknown as TelegramService,
    );
  });

  it('commits stock and order through the transaction and returns the order', async () => {
    const product = createProduct({ stock: 5 });
    const savedOrder = createSavedOrder();
    productRepo.findOne.mockResolvedValue(product);
    orderRepo.save.mockResolvedValue(savedOrder);

    const result = await service.checkout(7, {
      items: [{ productId: product.id, quantity: 2 }],
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(productRepo.findOne).toHaveBeenCalledWith({
      where: { id: product.id },
      lock: { mode: 'pessimistic_write' },
    });
    expect(product.stock).toBe(3);
    expect(productRepo.save).toHaveBeenCalledWith(product);
    expect(orderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { id: 7 },
        totalPrice: 20,
        status: 'pending',
      }),
    );
    expect(orderRepo.save).toHaveBeenCalledTimes(1);
    expect(result).toBe(savedOrder);
    expect(telegramService.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('propagates a later missing-product error and does not save an order', async () => {
    productRepo.findOne
      .mockResolvedValueOnce(createProduct({ id: 1, stock: 5 }))
      .mockResolvedValueOnce(null);

    await expect(
      service.checkout(7, {
        items: [
          { productId: 1, quantity: 1 },
          { productId: 2, quantity: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(productRepo.save).not.toHaveBeenCalled();
    expect(orderRepo.save).not.toHaveBeenCalled();
    expect(telegramService.sendMessage).not.toHaveBeenCalled();
  });

  it('rejects insufficient stock before saving stock or an order', async () => {
    productRepo.findOne.mockResolvedValue(createProduct({ stock: 1 }));

    await expect(
      service.checkout(7, {
        items: [{ productId: 1, quantity: 2 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(productRepo.save).not.toHaveBeenCalled();
    expect(orderRepo.save).not.toHaveBeenCalled();
    expect(telegramService.sendMessage).not.toHaveBeenCalled();
  });

  it('propagates order-save failure and does not notify Telegram', async () => {
    const saveError = new Error('order save failed');
    productRepo.findOne.mockResolvedValue(createProduct({ stock: 5 }));
    orderRepo.save.mockRejectedValue(saveError);

    await expect(
      service.checkout(7, {
        items: [{ productId: 1, quantity: 1 }],
      }),
    ).rejects.toBe(saveError);

    expect(productRepo.save).toHaveBeenCalledTimes(1);
    expect(telegramService.sendMessage).not.toHaveBeenCalled();
  });

  it('returns a committed order when Telegram notification rejects', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const savedOrder = createSavedOrder();
    productRepo.findOne.mockResolvedValue(createProduct({ stock: 5 }));
    orderRepo.save.mockResolvedValue(savedOrder);
    telegramService.sendMessage.mockRejectedValue(
      new Error('notification failed'),
    );

    await expect(
      service.checkout(7, {
        items: [{ productId: 1, quantity: 1 }],
      }),
    ).resolves.toBe(savedOrder);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(telegramService.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('locks unique product IDs in deterministic ascending order', async () => {
    productRepo.findOne.mockImplementation(
      async ({ where }: { where: { id: number } }) =>
        createProduct({ id: where.id, stock: 10 }),
    );
    orderRepo.save.mockResolvedValue(createSavedOrder());

    await service.checkout(7, {
      items: [
        { productId: 5, quantity: 1 },
        { productId: 2, quantity: 1 },
        { productId: 3, quantity: 1 },
      ],
    });

    expect(productRepo.findOne.mock.calls.map(([options]) => options)).toEqual([
      { where: { id: 2 }, lock: { mode: 'pessimistic_write' } },
      { where: { id: 3 }, lock: { mode: 'pessimistic_write' } },
      { where: { id: 5 }, lock: { mode: 'pessimistic_write' } },
    ]);
  });

  it('aggregates duplicate products into one stock update and order item', async () => {
    const product = createProduct({ id: 5, stock: 10 });
    productRepo.findOne.mockResolvedValue(product);
    orderRepo.save.mockResolvedValue(createSavedOrder());

    await service.checkout(7, {
      items: [
        { productId: 5, quantity: 1 },
        { productId: 5, quantity: 2 },
      ],
    });

    expect(productRepo.findOne).toHaveBeenCalledTimes(1);
    expect(product.stock).toBe(7);
    expect(productRepo.save).toHaveBeenCalledTimes(1);
    expect(orderItemRepo.create).toHaveBeenCalledTimes(1);
    expect(orderItemRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ product, quantity: 3, price: product.price }),
    );
    expect(orderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        totalPrice: 30,
        items: [expect.objectContaining({ quantity: 3 })],
      }),
    );
  });

  it('rejects when an aggregated quantity exceeds locked stock', async () => {
    productRepo.findOne.mockResolvedValue(
      createProduct({ id: 5, stock: 2 }),
    );

    await expect(
      service.checkout(7, {
        items: [
          { productId: 5, quantity: 1 },
          { productId: 5, quantity: 2 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(productRepo.findOne).toHaveBeenCalledTimes(1);
    expect(productRepo.save).not.toHaveBeenCalled();
    expect(orderRepo.save).not.toHaveBeenCalled();
    expect(telegramService.sendMessage).not.toHaveBeenCalled();
  });

  it('requests a pessimistic write lock before stock validation', async () => {
    productRepo.findOne.mockResolvedValue(createProduct({ stock: 1 }));

    await expect(
      service.checkout(7, {
        items: [{ productId: 1, quantity: 2 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(productRepo.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(productRepo.save).not.toHaveBeenCalled();
  });

  it('rejects when a requested product row is missing after locking', async () => {
    productRepo.findOne
      .mockResolvedValueOnce(createProduct({ id: 1, stock: 5 }))
      .mockResolvedValueOnce(null);

    await expect(
      service.checkout(7, {
        items: [
          { productId: 2, quantity: 1 },
          { productId: 1, quantity: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(productRepo.findOne.mock.calls.map(([options]) => options)).toEqual([
      { where: { id: 1 }, lock: { mode: 'pessimistic_write' } },
      { where: { id: 2 }, lock: { mode: 'pessimistic_write' } },
    ]);
    expect(productRepo.save).not.toHaveBeenCalled();
    expect(orderRepo.save).not.toHaveBeenCalled();
    expect(telegramService.sendMessage).not.toHaveBeenCalled();
  });
});

function createProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Product',
    description: 'Description',
    price: 10,
    stock: 5,
    createdAt: new Date(),
    ...overrides,
  };
}

function createSavedOrder(): Order {
  return {
    id: 11,
    totalPrice: 20,
    status: 'pending',
    user: { id: 7 } as Order['user'],
    items: [],
    createdAt: new Date(),
  };
}
