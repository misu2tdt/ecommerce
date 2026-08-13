import { BadRequestException } from '@nestjs/common';
import { DataSource, QueryFailedError, QueryRunner } from 'typeorm';
import { OrdersService } from '../../src/orders/orders.service';
import { OrderItem } from '../../src/orders/entities/order-item.entity';
import { Order } from '../../src/orders/entities/order.entity';
import { Product } from '../../src/products/entities/product.entity';
import { TelegramService } from '../../src/telegram/telegram.service';
import { UserRole } from '../../src/users/entities/user-role.enum';
import { User } from '../../src/users/entities/user.entity';
import { cleanTestDatabase, initializeTestDatabase } from './test-database';

const nonexistentUserId = 2_147_483_647;

describe('OrdersService PostgreSQL checkout integration', () => {
  let dataSource: DataSource;
  let sendMessage: jest.MockedFunction<TelegramService['sendMessage']>;
  let service: OrdersService;

  beforeAll(async () => {
    dataSource = await initializeTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestDatabase(dataSource);
    sendMessage = jest.fn().mockResolvedValue(undefined);
    service = new OrdersService(dataSource, {
      sendMessage,
    } as unknown as TelegramService);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await cleanTestDatabase(dataSource);
      await dataSource.destroy();
    }
  });

  it('rolls back a stock write when the later order insert violates the user FK', async () => {
    const productRepository = dataSource.getRepository(Product);
    const product = await productRepository.save(
      productRepository.create({
        name: 'Rollback product',
        description: 'Rollback proof',
        price: 25,
        stock: 2,
      }),
    );
    const querySpy = jest.spyOn(dataSource.logger, 'logQuery');

    let checkoutError: unknown;
    try {
      await service.checkout(nonexistentUserId, {
        items: [{ productId: product.id, quantity: 1 }],
      });
    } catch (error) {
      checkoutError = error;
    }

    const transactionQueries = querySpy.mock.calls.map(([query]) => query);
    querySpy.mockRestore();

    expect(checkoutError).toBeInstanceOf(QueryFailedError);
    expect(
      (checkoutError as QueryFailedError & { driverError: { code: string } })
        .driverError.code,
    ).toBe('23503');

    const stockWriteIndex = transactionQueries.findIndex((query) =>
      query.startsWith('UPDATE "products"'),
    );
    const orderInsertIndex = transactionQueries.findIndex((query) =>
      query.startsWith('INSERT INTO "orders"'),
    );
    expect(stockWriteIndex).toBeGreaterThanOrEqual(0);
    expect(orderInsertIndex).toBeGreaterThan(stockWriteIndex);

    const persistedProduct = await productRepository.findOneByOrFail({
      id: product.id,
    });
    expect(persistedProduct.stock).toBe(2);
    await expect(dataSource.getRepository(Order).count()).resolves.toBe(0);
    await expect(dataSource.getRepository(OrderItem).count()).resolves.toBe(0);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('allows exactly one of two overlapping checkouts to buy the final unit', async () => {
    const productRepository = dataSource.getRepository(Product);
    const userRepository = dataSource.getRepository(User);
    const product = await productRepository.save(
      productRepository.create({
        name: 'Final stock product',
        description: 'Concurrency proof',
        price: 40,
        stock: 1,
      }),
    );
    const [userA, userB] = await userRepository.save([
      userRepository.create({
        email: 'checkout-a@example.test',
        password: 'not-a-real-password-hash',
        role: UserRole.USER,
      }),
      userRepository.create({
        email: 'checkout-b@example.test',
        password: 'not-a-real-password-hash',
        role: UserRole.USER,
      }),
    ]);

    const blocker = dataSource.createQueryRunner();
    const checkoutPromises: Array<ReturnType<OrdersService['checkout']>> = [];
    let results: PromiseSettledResult<Order>[] = [];

    try {
      await blocker.connect();
      await blocker.startTransaction();
      await blocker.manager.getRepository(Product).findOneOrFail({
        where: { id: product.id },
        lock: { mode: 'pessimistic_write' },
      });

      checkoutPromises.push(
        service.checkout(userA.id, {
          items: [{ productId: product.id, quantity: 1 }],
        }),
        service.checkout(userB.id, {
          items: [{ productId: product.id, quantity: 1 }],
        }),
      );

      const waitingCheckoutCount = await waitForCheckoutLockWaiters(blocker, 2);
      expect(waitingCheckoutCount).toBeGreaterThanOrEqual(2);

      await blocker.commitTransaction();
      results = await Promise.allSettled(checkoutPromises);
    } finally {
      if (blocker.isTransactionActive) {
        await blocker.rollbackTransaction();
      }
      await blocker.release();
      await Promise.allSettled(checkoutPromises);
    }

    const fulfilled = results.filter(
      (result): result is PromiseFulfilledResult<Order> =>
        result.status === 'fulfilled',
    );
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(BadRequestException);

    const persistedProduct = await productRepository.findOneByOrFail({
      id: product.id,
    });
    expect(persistedProduct.stock).toBe(0);
    await expect(dataSource.getRepository(Order).count()).resolves.toBe(1);
    await expect(dataSource.getRepository(OrderItem).count()).resolves.toBe(1);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  }, 15_000);
});

async function waitForCheckoutLockWaiters(
  observer: QueryRunner,
  expectedCount: number,
): Promise<number> {
  const deadline = Date.now() + 5_000;
  let observed = { active: 0, lockWaiters: 0, productLockWaiters: 0 };

  while (Date.now() < deadline) {
    await observer.query('SELECT pg_stat_clear_snapshot()');
    const rows = (await observer.query(`
      SELECT
        COUNT(*) FILTER (WHERE state = 'active')::int AS "active",
        COUNT(*) FILTER (WHERE wait_event_type = 'Lock')::int AS "lockWaiters",
        COUNT(*) FILTER (
          WHERE wait_event_type = 'Lock'
            AND query LIKE '%FOR UPDATE%'
            AND query LIKE '%"products"%'
        )::int AS "productLockWaiters"
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
    `)) as Array<typeof observed>;

    observed = rows[0];

    if (observed.productLockWaiters >= expectedCount) {
      return observed.productLockWaiters;
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error(
    `Expected ${expectedCount} checkout lock waiters; observed active=${observed.active}, lock=${observed.lockWaiters}, productLock=${observed.productLockWaiters}`,
  );
}
