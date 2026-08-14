import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductReview } from './entities/product-review.entity';
import { AdminReviewsController } from './admin-reviews.controller';
import { ProductReviewsController } from './product-reviews.controller';
import { ProductReviewsService } from './product-reviews.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductReview, Product, OrderItem]),
    AuthModule,
  ],
  controllers: [ProductReviewsController, AdminReviewsController],
  providers: [ProductReviewsService],
})
export class ReviewsModule {}
