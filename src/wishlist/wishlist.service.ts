import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProductStatus } from '../products/entities/product-status.enum';
import { Product } from '../products/entities/product.entity';
import { WishlistItem } from './entities/wishlist-item.entity';

@Injectable()
export class WishlistService {
  constructor(private readonly dataSource: DataSource) {}

  findAll(userId: number) {
    return this.loadItems(userId);
  }

  async add(userId: number, productId: number) {
    const product = await this.dataSource
      .getRepository(Product)
      .findOneBy({ id: productId });
    if (!product) throw new NotFoundException('Product not found');
    if (product.status !== ProductStatus.ACTIVE)
      throw new BadRequestException('Inactive Product cannot be wishlisted');

    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(WishlistItem)
      .values({ userId, productId })
      .orIgnore()
      .execute();
    const item = (await this.loadItems(userId, productId))[0];
    if (!item) throw new NotFoundException('Wishlist item not found');
    return item;
  }

  async remove(userId: number, productId: number) {
    const result = await this.dataSource
      .getRepository(WishlistItem)
      .delete({ userId, productId });
    if (!result.affected)
      throw new NotFoundException('Wishlist item not found');
  }

  private async loadItems(userId: number, productId?: number) {
    const builder = this.dataSource
      .getRepository(WishlistItem)
      .createQueryBuilder('wishlist')
      .innerJoinAndSelect('wishlist.product', 'product')
      .innerJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect(
        'product.images',
        'image',
        'image.isPrimary = :isPrimary',
        { isPrimary: true },
      )
      .where('wishlist.userId = :userId', { userId })
      .addSelect(
        '(SELECT MIN(v."price") FROM "product_variants" v WHERE v."productId" = product.id AND v."isActive" = true)',
        'minPrice',
      )
      .addSelect(
        '(SELECT MAX(v."price") FROM "product_variants" v WHERE v."productId" = product.id AND v."isActive" = true)',
        'maxPrice',
      )
      .addSelect(
        'EXISTS(SELECT 1 FROM "product_variants" v WHERE v."productId" = product.id AND v."isActive" = true AND v."stock" > 0)',
        'inStock',
      );
    if (productId !== undefined)
      builder.andWhere('wishlist.productId = :productId', { productId });
    const { entities, raw } = await builder
      .orderBy('wishlist.createdAt', 'DESC')
      .addOrderBy('wishlist.id', 'DESC')
      .getRawAndEntities();

    return entities.map((item, index) => ({
      id: item.id,
      createdAt: item.createdAt,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        status: item.product.status,
        available: item.product.status === ProductStatus.ACTIVE,
        category: {
          id: item.product.category.id,
          name: item.product.category.name,
          slug: item.product.category.slug,
        },
        brand: item.product.brand
          ? {
              id: item.product.brand.id,
              name: item.product.brand.name,
              slug: item.product.brand.slug,
            }
          : null,
        primaryImage: item.product.images?.[0]
          ? {
              url: item.product.images[0].url,
              altText: item.product.images[0].altText,
            }
          : null,
        minPrice: raw[index].minPrice ?? null,
        maxPrice: raw[index].maxPrice ?? null,
        inStock: raw[index].inStock === true || raw[index].inStock === 'true',
      },
    }));
  }
}
