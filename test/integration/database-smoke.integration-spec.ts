import { DataSource, QueryFailedError } from 'typeorm';
import { Product } from '../../src/products/entities/product.entity';
import { ProductStatus } from '../../src/products/entities/product-status.enum';
import { ProductVariant } from '../../src/products/entities/product-variant.entity';
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
      { price: 123_400, stock: 3 },
    );

    const product = await repository.findOneByOrFail({ id: savedProduct.id });

    expect(product.name).toBe('Integration smoke product');
    expect(savedVariant.stock).toBe(3);
    expect(savedVariant.price).toBe(123_400);

    await expect(
      dataSource.getRepository(ProductVariant).update(savedVariant.id, {
        price: 123_400.5,
      }),
    ).rejects.toBeInstanceOf(RangeError);
    await expect(
      dataSource.query(
        'UPDATE "product_variants" SET "price" = $1 WHERE "id" = $2',
        [123_400.5, savedVariant.id],
      ),
    ).rejects.toBeInstanceOf(QueryFailedError);
  });
});
