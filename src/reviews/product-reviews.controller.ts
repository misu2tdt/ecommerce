import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { UpdateProductReviewDto } from './dto/update-product-review.dto';
import { ProductReviewsService } from './product-reviews.service';

@Controller('products/:productId/reviews')
export class ProductReviewsController {
  constructor(private readonly reviewsService: ProductReviewsService) {}

  @Get()
  findPublic(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviewsService.findPublic(productId);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreateProductReviewDto,
  ) {
    return this.reviewsService.create(user.id, productId, dto);
  }

  @Patch('mine')
  @UseGuards(AuthGuard)
  updateMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: UpdateProductReviewDto,
  ) {
    return this.reviewsService.updateMine(user.id, productId, dto);
  }

  @Delete('mine')
  @UseGuards(AuthGuard)
  removeMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.reviewsService.removeMine(user.id, productId);
  }
}
