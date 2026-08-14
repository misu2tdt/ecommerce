import { DataSource } from 'typeorm';
import { Brand } from '../../src/brands/entities/brand.entity';
import { Category } from '../../src/categories/entities/category.entity';
import { ProductVariant } from '../../src/products/entities/product-variant.entity';
import { Product } from '../../src/products/entities/product.entity';
import { Address } from '../../src/addresses/entities/address.entity';
import { User } from '../../src/users/entities/user.entity';

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
      price: 100_000,
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

export async function createAddress(
  dataSource: DataSource,
  user: User,
  suffix: string,
  overrides: Partial<Address> = {},
): Promise<Address> {
  const repository = dataSource.getRepository(Address);
  return repository.save(
    repository.create({
      userId: user.id,
      label: null,
      recipientName: `Recipient ${suffix}`,
      phone: '+12025550123',
      addressLine1: `Address ${suffix}`,
      addressLine2: null,
      ward: null,
      district: null,
      city: 'Test City',
      stateProvince: null,
      postalCode: null,
      countryCode: 'US',
      isDefault: false,
      ...overrides,
    }),
  );
}
