import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../brands/entities/brand.entity';
import { isUniqueViolation } from '../catalog/database-errors';
import { createSlug } from '../catalog/slug';
import { Category } from '../categories/entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductStatus } from './entities/product-status.enum';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Brand)
    private readonly brandsRepository: Repository<Brand>,
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
      price: dto.price,
      stock: dto.stock,
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

  async findAll(query: ProductQueryDto): Promise<Product[]> {
    const builder = this.productsRepository
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .where('product.status = :status', { status: ProductStatus.ACTIVE });

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

    return builder
      .orderBy('product.name', 'ASC')
      .addOrderBy('product.id', 'ASC')
      .getMany();
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { slug, status: ProductStatus.ACTIVE },
      relations: { category: true, brand: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
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
    const result = await this.productsRepository.delete(id);
    if (!result.affected) throw new NotFoundException('Product not found');
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
}
