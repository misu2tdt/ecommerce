import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProductStatus } from '../products/entities/product-status.enum';
import { Product } from '../products/entities/product.entity';
import { WishlistItem } from './entities/wishlist-item.entity';
import { WishlistService } from './wishlist.service';

describe('WishlistService', () => {
  const productRepo = { findOneBy: jest.fn() };
  const selectBuilder = chain({
    getRawAndEntities: jest.fn(),
  });
  const wishlistRepo = {
    createQueryBuilder: jest.fn(() => selectBuilder),
    delete: jest.fn(),
  };
  const insertBuilder = chain({ execute: jest.fn() });
  const dataSource = {
    getRepository: jest.fn((entity) =>
      entity === Product ? productRepo : wishlistRepo,
    ),
    createQueryBuilder: jest.fn(() => insertBuilder),
  };
  let service: WishlistService;

  beforeEach(() => {
    jest.clearAllMocks();
    productRepo.findOneBy.mockResolvedValue({
      id: 3,
      status: ProductStatus.ACTIVE,
    });
    insertBuilder.execute.mockResolvedValue({});
    selectBuilder.getRawAndEntities.mockResolvedValue(wishlistResult());
    wishlistRepo.delete.mockResolvedValue({ affected: 1 });
    service = new WishlistService(dataSource as unknown as DataSource);
  });

  it('adds an active Product idempotently with database conflict protection', async () => {
    await service.add(7, 3);
    await service.add(7, 3);
    expect(insertBuilder.orIgnore).toHaveBeenCalledTimes(2);
    expect(insertBuilder.execute).toHaveBeenCalledTimes(2);
  });

  it('rejects an inactive Product before insert', async () => {
    productRepo.findOneBy.mockResolvedValue({
      id: 3,
      status: ProductStatus.INACTIVE,
    });
    await expect(service.add(7, 3)).rejects.toBeInstanceOf(BadRequestException);
    expect(insertBuilder.execute).not.toHaveBeenCalled();
  });

  it('removes only an owned item and returns 404 when missing', async () => {
    await service.remove(7, 3);
    expect(wishlistRepo.delete).toHaveBeenCalledWith({
      userId: 7,
      productId: 3,
    });
    wishlistRepo.delete.mockResolvedValue({ affected: 0 });
    await expect(service.remove(8, 3)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns current Product card summary without storage metadata', async () => {
    const result = await service.findAll(7);
    expect(result[0].product).toEqual({
      id: 3,
      name: 'Product',
      slug: 'product',
      status: ProductStatus.ACTIVE,
      available: true,
      category: { id: 1, name: 'Category', slug: 'category' },
      brand: null,
      primaryImage: { url: 'https://example.test/main.jpg', altText: null },
      minPrice: '10.00',
      maxPrice: '20.00',
      inStock: true,
    });
    expect(result[0].product.primaryImage).not.toHaveProperty('storageKey');
  });
});

function chain(extra: Record<string, jest.Mock>) {
  const builder: Record<string, jest.Mock> = { ...extra };
  for (const method of [
    'insert',
    'into',
    'values',
    'orIgnore',
    'innerJoinAndSelect',
    'leftJoinAndSelect',
    'where',
    'addSelect',
    'andWhere',
    'orderBy',
    'addOrderBy',
  ])
    builder[method] = jest.fn(() => builder);
  return builder;
}

function wishlistResult() {
  return {
    entities: [
      {
        id: 9,
        createdAt: new Date(),
        product: {
          id: 3,
          name: 'Product',
          slug: 'product',
          status: ProductStatus.ACTIVE,
          category: { id: 1, name: 'Category', slug: 'category' },
          brand: null,
          images: [
            {
              url: 'https://example.test/main.jpg',
              altText: null,
              storageKey: 'must-not-leak',
            },
          ],
        },
      } as WishlistItem,
    ],
    raw: [{ minPrice: '10.00', maxPrice: '20.00', inStock: true }],
  };
}
