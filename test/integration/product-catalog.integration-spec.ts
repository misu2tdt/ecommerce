import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { BrandsService } from '../../src/brands/brands.service';
import { Brand } from '../../src/brands/entities/brand.entity';
import { CategoriesService } from '../../src/categories/categories.service';
import { Category } from '../../src/categories/entities/category.entity';
import { ImageStorageService } from '../../src/image-storage/image-storage.service';
import { OrdersService } from '../../src/orders/orders.service';
import { OrderItem } from '../../src/orders/entities/order-item.entity';
import { Order } from '../../src/orders/entities/order.entity';
import { ProductStatus } from '../../src/products/entities/product-status.enum';
import { ProductImage } from '../../src/products/entities/product-image.entity';
import { Product } from '../../src/products/entities/product.entity';
import { ProductsService } from '../../src/products/products.service';
import { TelegramService } from '../../src/telegram/telegram.service';
import { UserRole } from '../../src/users/entities/user-role.enum';
import { User } from '../../src/users/entities/user.entity';
import { createBrand, createCategory } from './catalog-fixtures';
import { cleanTestDatabase, initializeTestDatabase } from './test-database';

describe('Product catalog PostgreSQL integration', () => {
  let dataSource: DataSource;
  let productsService: ProductsService;
  let categoriesService: CategoriesService;
  let brandsService: BrandsService;

  beforeAll(async () => {
    dataSource = await initializeTestDatabase();
    productsService = new ProductsService(
      dataSource.getRepository(Product),
      dataSource.getRepository(Category),
      dataSource.getRepository(Brand),
      dataSource.getRepository(ProductImage),
      { deleteImage: jest.fn() } as unknown as ImageStorageService,
    );
    categoriesService = new CategoriesService(
      dataSource.getRepository(Category),
    );
    brandsService = new BrandsService(dataSource.getRepository(Brand));
  });

  beforeEach(async () => cleanTestDatabase(dataSource));

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await cleanTestDatabase(dataSource);
      await dataSource.destroy();
    }
  });

  it('persists required Category, optional Brand and generated slug', async () => {
    const category = await createCategory(dataSource, 'relations');
    const brand = await createBrand(dataSource, 'relations');

    const product = await productsService.create({
      name: 'Catalog Laptop',
      price: 100,
      stock: 5,
      categoryId: category.id,
      brandId: brand.id,
    });
    const persisted = await dataSource.getRepository(Product).findOneOrFail({
      where: { id: product.id },
      relations: { category: true, brand: true },
    });

    expect(persisted.slug).toBe('catalog-laptop');
    expect(persisted.category.id).toBe(category.id);
    expect(persisted.brand?.id).toBe(brand.id);
  });

  it('enforces Category FK and maps referenced Category/Brand deletes to 409', async () => {
    const category = await createCategory(dataSource, 'fk');
    const brand = await createBrand(dataSource, 'fk');
    await productsService.create({
      name: 'Referenced Product',
      price: 20,
      stock: 1,
      categoryId: category.id,
      brandId: brand.id,
    });

    await expect(categoriesService.remove(category.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(brandsService.remove(brand.id)).rejects.toBeInstanceOf(
      ConflictException,
    );

    const repository = dataSource.getRepository(Product);
    await expectForeignKeyViolation(
      repository.save(
        repository.create({
          name: 'Invalid category Product',
          slug: 'invalid-category-product',
          price: 10,
          stock: 1,
          status: ProductStatus.ACTIVE,
          categoryId: 2_147_483_647,
          brandId: null,
        }),
      ),
    );
  });

  it('returns only active Products with composable catalog filters', async () => {
    const laptops = await createCategory(dataSource, 'laptops');
    const phones = await createCategory(dataSource, 'phones');
    const acme = await createBrand(dataSource, 'acme');

    await productsService.create({
      name: 'Acme Macbook Alternative',
      price: 100,
      stock: 3,
      categoryId: laptops.id,
      brandId: acme.id,
    });
    await productsService.create({
      name: 'Inactive Macbook',
      price: 200,
      stock: 3,
      categoryId: laptops.id,
      brandId: acme.id,
      status: ProductStatus.INACTIVE,
    });
    await productsService.create({
      name: 'Active Phone',
      price: 50,
      stock: 3,
      categoryId: phones.id,
    });

    const products = await productsService.findAll({
      category: laptops.slug,
      brand: acme.slug,
      q: 'macbook',
    });

    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Acme Macbook Alternative');
    await expect(
      productsService.findBySlug('inactive-macbook'),
    ).rejects.toBeDefined();
  });

  it('rejects checkout of an inactive locked Product without writes', async () => {
    const category = await createCategory(dataSource, 'inactive-checkout');
    const product = await productsService.create({
      name: 'Inactive Checkout Product',
      price: 30,
      stock: 4,
      categoryId: category.id,
      status: ProductStatus.INACTIVE,
    });
    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.save(
      userRepository.create({
        email: 'inactive-checkout@example.test',
        password: 'not-a-real-password-hash',
        role: UserRole.USER,
      }),
    );
    const sendMessage = jest.fn().mockResolvedValue(undefined);
    const ordersService = new OrdersService(dataSource, {
      sendMessage,
    } as unknown as TelegramService);

    await expect(
      ordersService.checkout(user.id, {
        items: [{ productId: product.id, quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const persisted = await dataSource.getRepository(Product).findOneByOrFail({
      id: product.id,
    });
    expect(persisted.stock).toBe(4);
    await expect(dataSource.getRepository(Order).count()).resolves.toBe(0);
    await expect(dataSource.getRepository(OrderItem).count()).resolves.toBe(0);
    expect(sendMessage).not.toHaveBeenCalled();
  });
});

async function expectForeignKeyViolation(operation: Promise<unknown>) {
  try {
    await operation;
    throw new Error('Expected PostgreSQL foreign-key violation');
  } catch (error) {
    expect(error).toBeInstanceOf(QueryFailedError);
    expect(
      (error as QueryFailedError & { driverError: { code: string } })
        .driverError.code,
    ).toBe('23503');
  }
}
