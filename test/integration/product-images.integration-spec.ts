import { ConflictException } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { BrandsService } from '../../src/brands/brands.service';
import { Brand } from '../../src/brands/entities/brand.entity';
import { CategoriesService } from '../../src/categories/categories.service';
import { Category } from '../../src/categories/entities/category.entity';
import { ProductImage } from '../../src/products/entities/product-image.entity';
import { Product } from '../../src/products/entities/product.entity';
import { ProductImagesService } from '../../src/products/product-images.service';
import { ProductsService } from '../../src/products/products.service';
import { createBrand, createCategory } from './catalog-fixtures';
import { cleanTestDatabase, initializeTestDatabase } from './test-database';

describe('ProductImage PostgreSQL integration', () => {
  let dataSource: DataSource;
  let imagesService: ProductImagesService;
  let productsService: ProductsService;

  beforeAll(async () => {
    dataSource = await initializeTestDatabase();
    imagesService = new ProductImagesService(
      dataSource.getRepository(ProductImage),
      dataSource,
    );
    productsService = new ProductsService(
      dataSource.getRepository(Product),
      dataSource.getRepository(Category),
      dataSource.getRepository(Brand),
    );
  });

  beforeEach(async () => cleanTestDatabase(dataSource));

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await cleanTestDatabase(dataSource);
      await dataSource.destroy();
    }
  });

  it('persists multiple images owned by the correct Product', async () => {
    const product = await createProduct('ownership');

    await imagesService.createForProduct(product.id, {
      url: 'https://example.test/ownership-1.jpg',
    });
    await imagesService.createForProduct(product.id, {
      url: 'https://example.test/ownership-2.jpg',
      position: 10,
    });

    const images = await dataSource.getRepository(ProductImage).find({
      where: { productId: product.id },
    });
    expect(images).toHaveLength(2);
    expect(images.every((image) => image.productId === product.id)).toBe(true);
  });

  it('cascades Product image deletion while keeping Category and Brand RESTRICT', async () => {
    const category = await createCategory(dataSource, 'delete-semantics');
    const brand = await createBrand(dataSource, 'delete-semantics');
    const product = await productsService.create({
      name: 'Delete semantics Product',
      price: 25,
      stock: 1,
      categoryId: category.id,
      brandId: brand.id,
    });
    await imagesService.createForProduct(product.id, {
      url: 'https://example.test/cascade.jpg',
    });

    const categoriesService = new CategoriesService(
      dataSource.getRepository(Category),
    );
    const brandsService = new BrandsService(dataSource.getRepository(Brand));
    await expect(categoriesService.remove(category.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(brandsService.remove(brand.id)).rejects.toBeInstanceOf(
      ConflictException,
    );

    await productsService.remove(product.id);
    await expect(
      dataSource.getRepository(ProductImage).countBy({ productId: product.id }),
    ).resolves.toBe(0);
  });

  it('switches primary atomically and the partial unique index rejects two primaries', async () => {
    const product = await createProduct('primary');
    const first = await imagesService.createForProduct(product.id, {
      url: 'https://example.test/primary-1.jpg',
      isPrimary: true,
    });
    const second = await imagesService.createForProduct(product.id, {
      url: 'https://example.test/primary-2.jpg',
    });

    await imagesService.updateForProduct(product.id, second.id, {
      isPrimary: true,
    });

    const repository = dataSource.getRepository(ProductImage);
    const persisted = await repository.find({
      where: { productId: product.id },
    });
    expect(persisted.filter((image) => image.isPrimary)).toHaveLength(1);
    expect(persisted.find((image) => image.id === first.id)?.isPrimary).toBe(
      false,
    );
    expect(persisted.find((image) => image.id === second.id)?.isPrimary).toBe(
      true,
    );

    await expectUniqueViolation(
      repository.save(
        repository.create({
          productId: product.id,
          url: 'https://example.test/duplicate-primary.jpg',
          storageKey: null,
          altText: null,
          position: 20,
          isPrimary: true,
        }),
      ),
    );
  });

  it('returns a sanitized deterministic gallery and only the primary image in filtered lists', async () => {
    const category = await createCategory(dataSource, 'gallery');
    const product = await productsService.create({
      name: 'Gallery Product',
      price: 50,
      stock: 3,
      categoryId: category.id,
    });
    const first = await imagesService.createForProduct(product.id, {
      url: 'https://example.test/gallery-first.jpg',
      position: 0,
      storageKey: 'private/storage/key-first',
    });
    const second = await imagesService.createForProduct(product.id, {
      url: 'https://example.test/gallery-second.jpg',
      position: 0,
      storageKey: 'private/storage/key-second',
    });
    const primary = await imagesService.createForProduct(product.id, {
      url: 'https://example.test/gallery-primary.jpg',
      position: 50,
      isPrimary: true,
      storageKey: 'private/storage/key-primary',
    });

    const detail = await productsService.findBySlug(product.slug);
    expect(detail.images.map((image) => image.id)).toEqual([
      primary.id,
      first.id,
      second.id,
    ]);
    expect(detail.images.every((image) => !('storageKey' in image))).toBe(true);

    const list = await productsService.findAll({ category: category.slug });
    expect(list).toHaveLength(1);
    expect(list[0].images.map((image) => image.id)).toEqual([primary.id]);
    expect(list[0].images[0]).not.toHaveProperty('storageKey');
  });

  async function createProduct(suffix: string): Promise<Product> {
    const category = await createCategory(dataSource, suffix);
    return productsService.create({
      name: `Image Product ${suffix}`,
      price: 10,
      stock: 2,
      categoryId: category.id,
    });
  }
});

async function expectUniqueViolation(operation: Promise<unknown>) {
  try {
    await operation;
    throw new Error('Expected PostgreSQL unique violation');
  } catch (error) {
    expect(error).toBeInstanceOf(QueryFailedError);
    expect(
      (error as QueryFailedError & { driverError: { code: string } })
        .driverError.code,
    ).toBe('23505');
  }
}
