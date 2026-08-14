import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../brands/entities/brand.entity';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../catalog/database-errors';
import { createSlug } from '../catalog/slug';
import { Category } from '../categories/entities/category.entity';
import { ImageStorageService } from '../image-storage/image-storage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductStatus } from './entities/product-status.enum';
import { ProductImage } from './entities/product-image.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from './entities/product.entity';

export type PublicProductImage = Omit<ProductImage, 'storageKey' | 'product'>;
export type PublicProduct = Omit<Product, 'images' | 'variants'> & {
  images: PublicProductImage[];
  minPrice: string | null;
  maxPrice: string | null;
  inStock: boolean;
  variants?: Array<
    Pick<
      ProductVariant,
      'id' | 'sku' | 'name' | 'price' | 'stock' | 'attributes' | 'position'
    >
  >;
};

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Brand)
    private readonly brandsRepository: Repository<Brand>,
    @InjectRepository(ProductImage)
    private readonly productImagesRepository: Repository<ProductImage>,
    private readonly imageStorage: ImageStorageService,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const category = await this.findCategory(dto.categoryId);
    const brand = dto.brandId ? await this.findBrand(dto.brandId) : null;
    const slug = createSlug(dto.name);

    if (await this.productsRepository.existsBy({ slug })) {
      throw new ConflictException('Product slug already exists');
    }

    const product = this.productsRepository.create({
      name: dto.name,
      description: dto.description,
      status: dto.status ?? ProductStatus.ACTIVE,
      slug,
      categoryId: category.id,
      category,
      brandId: brand?.id ?? null,
      brand,
    });

    try {
      return await this.productsRepository.save(product);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Product slug already exists');
      }
      throw error;
    }
  }

  async findAll(query: ProductQueryDto): Promise<PublicProduct[]> {
    const builder = this.productsRepository
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect(
        'product.images',
        'image',
        'image.isPrimary = :isPrimary',
        { isPrimary: true },
      )
      .where('product.status = :status', { status: ProductStatus.ACTIVE });

    builder
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

    if (query.category) {
      builder.andWhere('category.slug = :categorySlug', {
        categorySlug: query.category,
      });
    }
    if (query.brand) {
      builder.andWhere('brand.slug = :brandSlug', { brandSlug: query.brand });
    }
    if (query.q) {
      builder.andWhere('product.name ILIKE :search', {
        search: `%${query.q}%`,
      });
    }

    const { entities, raw } = await builder
      .orderBy('product.name', 'ASC')
      .addOrderBy('product.id', 'ASC')
      .addOrderBy('image.position', 'ASC')
      .addOrderBy('image.id', 'ASC')
      .getRawAndEntities();

    return entities.map((product, index) =>
      this.toPublicProduct(product, {
        minPrice: raw[index].minPrice ?? null,
        maxPrice: raw[index].maxPrice ?? null,
        inStock: raw[index].inStock === true,
      }),
    );
  }

  async findBySlug(slug: string): Promise<PublicProduct> {
    const product = await this.productsRepository
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.images', 'image')
      .leftJoinAndSelect(
        'product.variants',
        'variant',
        'variant.isActive = true',
      )
      .where('product.slug = :slug', { slug })
      .andWhere('product.status = :status', {
        status: ProductStatus.ACTIVE,
      })
      .orderBy('image.isPrimary', 'DESC')
      .addOrderBy('image.position', 'ASC')
      .addOrderBy('image.id', 'ASC')
      .addOrderBy('variant.position', 'ASC')
      .addOrderBy('variant.id', 'ASC')
      .getOne();
    if (!product) throw new NotFoundException('Product not found');
    const variants = product.variants ?? [];
    const prices = variants.map((variant) => Number(variant.price));
    return this.toPublicProduct(product, {
      minPrice: prices.length ? Math.min(...prices).toFixed(2) : null,
      maxPrice: prices.length ? Math.max(...prices).toFixed(2) : null,
      inStock: variants.some((variant) => variant.stock > 0),
      variants: variants.map(
        ({ id, sku, name, price, stock, attributes, position }) => ({
          id,
          sku,
          name,
          price,
          stock,
          attributes,
          position,
        }),
      ),
    });
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: { category: true, brand: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (dto.categoryId !== undefined) {
      const category = await this.findCategory(dto.categoryId);
      product.categoryId = category.id;
      product.category = category;
    }
    if (dto.brandId !== undefined) {
      const brand =
        dto.brandId === null ? null : await this.findBrand(dto.brandId);
      product.brandId = brand?.id ?? null;
      product.brand = brand;
    }

    const { categoryId: _categoryId, brandId: _brandId, ...fields } = dto;
    Object.assign(product, fields);
    return this.productsRepository.save(product);
  }

  async remove(id: number): Promise<void> {
    const images = await this.productImagesRepository.find({
      where: { productId: id },
      select: { id: true, storageKey: true },
    });
    try {
      const result = await this.productsRepository.delete(id);
      if (!result.affected) throw new NotFoundException('Product not found');
    } catch (error) {
      if (isForeignKeyViolation(error))
        throw new ConflictException('Product is referenced by order history');
      throw error;
    }

    for (const image of images) {
      if (!image.storageKey) continue;
      try {
        await this.imageStorage.deleteImage(image.storageKey);
      } catch {
        this.logger.error(
          `Failed to clean up storage for image ${image.id} after deleting product ${id}`,
        );
      }
    }
  }

  private async findCategory(id: number): Promise<Category> {
    const category = await this.categoriesRepository.findOneBy({ id });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  private async findBrand(id: number): Promise<Brand> {
    const brand = await this.brandsRepository.findOneBy({ id });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  private toPublicProduct(
    product: Product,
    summary: Pick<
      PublicProduct,
      'minPrice' | 'maxPrice' | 'inStock' | 'variants'
    >,
  ): PublicProduct {
    const { images = [], variants: _variants, ...fields } = product;
    return {
      ...fields,
      ...summary,
      images: images.map(
        ({ storageKey: _storageKey, product: _product, ...image }) => image,
      ),
    };
  }
}
