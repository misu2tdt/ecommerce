import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { ProductImage } from './entities/product-image.entity';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductImagesService {
  constructor(
    @InjectRepository(ProductImage)
    private readonly imagesRepository: Repository<ProductImage>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  createForProduct(
    productId: number,
    dto: CreateProductImageDto,
  ): Promise<ProductImage> {
    return this.dataSource.transaction(async (manager) => {
      await this.requireProduct(manager, productId);

      if (dto.isPrimary === true) {
        await this.unsetPrimary(manager, productId);
      }

      return manager.save(
        manager.create(ProductImage, {
          ...dto,
          storageKey: dto.storageKey ?? null,
          altText: dto.altText ?? null,
          position: dto.position ?? 0,
          isPrimary: dto.isPrimary ?? false,
          productId,
        }),
      );
    });
  }

  updateForProduct(
    productId: number,
    imageId: number,
    dto: UpdateProductImageDto,
  ): Promise<ProductImage> {
    return this.dataSource.transaction(async (manager) => {
      await this.requireProduct(manager, productId);
      const image = await this.requireOwnedImage(manager, productId, imageId);

      if (dto.isPrimary === true) {
        await this.unsetPrimary(manager, productId);
      }

      Object.assign(image, dto);
      return manager.save(image);
    });
  }

  removeForProduct(productId: number, imageId: number): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      await this.requireProduct(manager, productId);
      const image = await this.requireOwnedImage(manager, productId, imageId);
      await manager.remove(image);
    });
  }

  async findForProduct(productId: number): Promise<ProductImage[]> {
    if (
      !(await this.imagesRepository.manager.exists(Product, {
        where: { id: productId },
      }))
    ) {
      throw new NotFoundException('Product not found');
    }

    return this.imagesRepository.find({
      where: { productId },
      order: { isPrimary: 'DESC', position: 'ASC', id: 'ASC' },
    });
  }

  private async requireProduct(
    manager: EntityManager,
    productId: number,
  ): Promise<void> {
    if (!(await manager.exists(Product, { where: { id: productId } }))) {
      throw new NotFoundException('Product not found');
    }
  }

  private async requireOwnedImage(
    manager: EntityManager,
    productId: number,
    imageId: number,
  ): Promise<ProductImage> {
    const image = await manager.findOne(ProductImage, {
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('Product image not found');
    return image;
  }

  private unsetPrimary(
    manager: EntityManager,
    productId: number,
  ): Promise<unknown> {
    return manager.update(
      ProductImage,
      { productId, isPrimary: true },
      { isPrimary: false },
    );
  }
}
