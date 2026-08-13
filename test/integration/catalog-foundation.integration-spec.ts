import { ConflictException } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { BrandsService } from '../../src/brands/brands.service';
import { Brand } from '../../src/brands/entities/brand.entity';
import { CategoriesService } from '../../src/categories/categories.service';
import { Category } from '../../src/categories/entities/category.entity';
import { cleanTestDatabase, initializeTestDatabase } from './test-database';

describe('Category and Brand PostgreSQL integration', () => {
  let dataSource: DataSource;
  let categoriesService: CategoriesService;
  let brandsService: BrandsService;

  beforeAll(async () => {
    dataSource = await initializeTestDatabase();
    categoriesService = new CategoriesService(
      dataSource.getRepository(Category),
    );
    brandsService = new BrandsService(dataSource.getRepository(Brand));
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

  it('persists a Category and enforces its unique slug', async () => {
    const category = await categoriesService.create({
      name: 'Điện Thoại',
      description: 'Mobile devices',
    });

    await expect(categoriesService.findBySlug('dien-thoai')).resolves.toEqual(
      expect.objectContaining({ id: category.id, name: 'Điện Thoại' }),
    );
    await expect(
      categoriesService.create({ name: 'Điện Thoại' }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expectUniqueSlugConstraint(
      dataSource.getRepository(Category).save(
        dataSource.getRepository(Category).create({
          name: 'Duplicate category row',
          slug: category.slug,
        }),
      ),
    );
  });

  it('persists a Brand and enforces its unique slug', async () => {
    const brand = await brandsService.create({
      name: 'Gaming Gear',
      description: 'Gaming hardware',
    });

    await expect(brandsService.findBySlug('gaming-gear')).resolves.toEqual(
      expect.objectContaining({ id: brand.id, name: 'Gaming Gear' }),
    );
    await expect(
      brandsService.create({ name: 'Gaming Gear' }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expectUniqueSlugConstraint(
      dataSource.getRepository(Brand).save(
        dataSource.getRepository(Brand).create({
          name: 'Duplicate brand row',
          slug: brand.slug,
        }),
      ),
    );
  });
});

async function expectUniqueSlugConstraint(operation: Promise<unknown>) {
  try {
    await operation;
    throw new Error('Expected PostgreSQL unique constraint violation');
  } catch (error) {
    expect(error).toBeInstanceOf(QueryFailedError);
    expect(
      (error as QueryFailedError & { driverError: { code: string } })
        .driverError.code,
    ).toBe('23505');
  }
}
