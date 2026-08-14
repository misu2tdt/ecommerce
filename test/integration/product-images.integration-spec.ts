import { ConflictException } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { BrandsService } from '../../src/brands/brands.service';
import { Brand } from '../../src/brands/entities/brand.entity';
import { CategoriesService } from '../../src/categories/categories.service';
import { Category } from '../../src/categories/entities/category.entity';
import { ImageStorageService } from '../../src/image-storage/image-storage.service';
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
  const imageStorage = {
    uploadProductImage: jest.fn(),
    deleteImage: jest.fn(),
  };
  const validFile = {
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
    mimetype: 'image/jpeg',
    size: 4,
  };

  beforeAll(async () => {
    dataSource = await initializeTestDatabase();
    imagesService = new ProductImagesService(
      dataSource.getRepository(ProductImage),
      dataSource,
      imageStorage as unknown as ImageStorageService,
    );
    productsService = new ProductsService(
      dataSource.getRepository(Product),
      dataSource.getRepository(Category),
      dataSource.getRepository(Brand),
      dataSource.getRepository(ProductImage),
      imageStorage as unknown as ImageStorageService,
    );
  });

  beforeEach(async () => {
    await cleanTestDatabase(dataSource);
    jest.clearAllMocks();
    imageStorage.uploadProductImage.mockImplementation(
      async (productId: number) => ({
        url: `https://res.cloudinary.com/demo/${productId}/${imageStorage.uploadProductImage.mock.calls.length}.jpg`,
        storageKey: `ecommerce/products/${productId}/${imageStorage.uploadProductImage.mock.calls.length}`,
      }),
    );
    imageStorage.deleteImage.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await cleanTestDatabase(dataSource);
      await dataSource.destroy();
    }
  });

  it('persists multiple images owned by the correct Product', async () => {
    const product = await createProduct('ownership');

    await imagesService.uploadForProduct(product.id, {}, validFile);
    await imagesService.uploadForProduct(
      product.id,
      { position: 10 },
      validFile,
    );

    const images = await dataSource.getRepository(ProductImage).find({
      where: { productId: product.id },
    });
    expect(images).toHaveLength(2);
    expect(images.every((image) => image.productId === product.id)).toBe(true);
    expect(images[0]).toEqual(
      expect.objectContaining({
        url: expect.stringMatching(/^https:\/\//),
        storageKey: expect.stringContaining(`ecommerce/products/${product.id}`),
      }),
    );
  });

  it('cascades Product image deletion while keeping Category and Brand RESTRICT', async () => {
    const category = await createCategory(dataSource, 'delete-semantics');
    const brand = await createBrand(dataSource, 'delete-semantics');
    const product = await productsService.create({
      name: 'Delete semantics Product',
      categoryId: category.id,
      brandId: brand.id,
    });
    await imagesService.uploadForProduct(product.id, {}, validFile);

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
    expect(imageStorage.deleteImage).toHaveBeenCalled();
  });

  it('deletes image metadata before fake provider cleanup', async () => {
    const product = await createProduct('image-delete');
    const image = await imagesService.uploadForProduct(
      product.id,
      {},
      validFile,
    );

    await imagesService.removeForProduct(product.id, image.id);

    await expect(
      dataSource.getRepository(ProductImage).findOneBy({ id: image.id }),
    ).resolves.toBeNull();
    expect(imageStorage.deleteImage).toHaveBeenCalledWith(image.storageKey);
  });

  it('switches primary atomically and the partial unique index rejects two primaries', async () => {
    const product = await createProduct('primary');
    const first = await imagesService.uploadForProduct(
      product.id,
      { isPrimary: true },
      validFile,
    );
    const second = await imagesService.uploadForProduct(
      product.id,
      {},
      validFile,
    );

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
      categoryId: category.id,
    });
    const first = await imagesService.uploadForProduct(
      product.id,
      { position: 0 },
      validFile,
    );
    const second = await imagesService.uploadForProduct(
      product.id,
      { position: 0 },
      validFile,
    );
    const primary = await imagesService.uploadForProduct(
      product.id,
      { position: 50, isPrimary: true },
      validFile,
    );

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
