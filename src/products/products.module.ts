import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { AuthModule } from '../auth/auth.module';
import { Category } from '../categories/entities/category.entity';
import { Brand } from '../brands/entities/brand.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductImagesService } from './product-images.service';
import { ImageStorageService } from '../image-storage/image-storage.service';
import { CloudinaryImageStorageService } from '../image-storage/cloudinary-image-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage, Category, Brand]),
    AuthModule,
  ],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ProductImagesService,
    { provide: ImageStorageService, useClass: CloudinaryImageStorageService },
  ],
})
export class ProductsModule {}
