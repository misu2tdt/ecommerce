import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  ImageStorageService,
  ProductImageUpload,
  StoredImage,
} from '../image-storage/image-storage.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { ProductImage } from './entities/product-image.entity';
import { Product } from './entities/product.entity';
import { validateProductImageFile } from './product-image-upload';

@Injectable()
export class ProductImagesService {
  private readonly logger = new Logger(ProductImagesService.name);

  constructor(
    @InjectRepository(ProductImage)
    private readonly imagesRepository: Repository<ProductImage>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly imageStorage: ImageStorageService,
  ) {}

  async uploadForProduct(
    productId: number,
    dto: CreateProductImageDto,
    file: (ProductImageUpload & { size?: number }) | undefined,
  ): Promise<ProductImage> {
    validateProductImageFile(file);
    await this.requireProduct(this.imagesRepository.manager, productId);

    const stored = await this.imageStorage.uploadProductImage(productId, file);
    try {
      return await this.createForProduct(productId, dto, stored);
    } catch (error) {
      try {
        await this.imageStorage.deleteImage(stored.storageKey);
      } catch {
        this.logger.error(
          `Failed to compensate uploaded image after ProductImage persistence failure for product ${productId}`,
        );
      }
      throw error;
    }
  }

  private createForProduct(
    productId: number,
    dto: CreateProductImageDto,
    stored: StoredImage,
  ): Promise<ProductImage> {
    return this.dataSource.transaction(async (manager) => {
      await this.requireProduct(manager, productId);

      if (dto.isPrimary === true) {
        await this.unsetPrimary(manager, productId);
      }

      return manager.save(
        manager.create(ProductImage, {
          ...dto,
          url: stored.url,
          storageKey: stored.storageKey,
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
    return this.removeMetadata(productId, imageId).then(async (storageKey) => {
      if (!storageKey) return;
      try {
        await this.imageStorage.deleteImage(storageKey);
      } catch {
        this.logger.error(
          `Failed to clean up storage for deleted ProductImage ${imageId}`,
        );
      }
    });
  }

  private removeMetadata(
    productId: number,
    imageId: number,
  ): Promise<string | null> {
    return this.dataSource.transaction(async (manager) => {
      await this.requireProduct(manager, productId);
      const image = await this.requireOwnedImage(manager, productId, imageId);
      await manager.remove(image);
      return image.storageKey;
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
