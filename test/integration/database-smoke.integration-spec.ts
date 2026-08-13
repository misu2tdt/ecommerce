import { DataSource } from 'typeorm';
import { Product } from '../../src/products/entities/product.entity';
import { cleanTestDatabase, initializeTestDatabase } from './test-database';

describe('PostgreSQL integration harness', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await initializeTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestDatabase(dataSource);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await cleanTestDatabase(dataSource);
      await dataSource.destroy();
    }
  });

  it('persists and reads a Product through the migrated schema', async () => {
    const repository = dataSource.getRepository(Product);
    const savedProduct = await repository.save(
      repository.create({
        name: 'Integration smoke product',
        description: 'Created only in ecommerce_test',
        price: 12.34,
        stock: 3,
      }),
    );

    const product = await repository.findOneByOrFail({ id: savedProduct.id });

    expect(product.name).toBe('Integration smoke product');
    expect(product.stock).toBe(3);
    expect(Number(product.price)).toBe(12.34);
  });
});
