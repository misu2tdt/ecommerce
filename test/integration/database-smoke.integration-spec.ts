import { DataSource } from 'typeorm';
import { Product } from '../../src/products/entities/product.entity';
import { ProductStatus } from '../../src/products/entities/product-status.enum';
import { createCategory, createVariant } from './catalog-fixtures';
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
    const category = await createCategory(dataSource, 'smoke');
    const savedProduct = await repository.save(
      repository.create({
        name: 'Integration smoke product',
        slug: 'integration-smoke-product',
        description: 'Created only in ecommerce_test',
        status: ProductStatus.ACTIVE,
        categoryId: category.id,
        category,
        brandId: null,
        brand: null,
      }),
    );
    const savedVariant = await createVariant(
      dataSource,
      savedProduct,
      'smoke',
      { price: 12.34, stock: 3 },
    );

    const product = await repository.findOneByOrFail({ id: savedProduct.id });

    expect(product.name).toBe('Integration smoke product');
    expect(savedVariant.stock).toBe(3);
    expect(Number(savedVariant.price)).toBe(12.34);
  });
});
