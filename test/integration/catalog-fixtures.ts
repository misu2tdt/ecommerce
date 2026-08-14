import { DataSource } from 'typeorm';
import { Brand } from '../../src/brands/entities/brand.entity';
import { Category } from '../../src/categories/entities/category.entity';
import { ProductVariant } from '../../src/products/entities/product-variant.entity';
import { Product } from '../../src/products/entities/product.entity';

export async function createCategory(
  dataSource: DataSource,
  suffix: string,
): Promise<Category> {
  const repository = dataSource.getRepository(Category);
  return repository.save(
    repository.create({
      name: `Category ${suffix}`,
      slug: `category-${suffix}`,
    }),
  );
}

export async function createVariant(
  dataSource: DataSource,
  product: Product,
  suffix: string,
  overrides: Partial<ProductVariant> = {},
): Promise<ProductVariant> {
  const repository = dataSource.getRepository(ProductVariant);
  return repository.save(
    repository.create({
      productId: product.id,
      product,
      sku: `SKU-${suffix}`.toUpperCase(),
      name: `Variant ${suffix}`,
      price: 10,
      stock: 5,
      attributes: {},
      isActive: true,
      position: 0,
      ...overrides,
    }),
  );
}

export async function createBrand(
  dataSource: DataSource,
  suffix: string,
): Promise<Brand> {
  const repository = dataSource.getRepository(Brand);
  return repository.save(
    repository.create({ name: `Brand ${suffix}`, slug: `brand-${suffix}` }),
  );
}
