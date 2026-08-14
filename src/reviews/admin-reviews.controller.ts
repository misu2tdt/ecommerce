import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/entities/user-role.enum';
import { UpdateReviewVisibilityDto } from './dto/update-review-visibility.dto';
import { ProductReviewsService } from './product-reviews.service';

@Controller('admin/reviews')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminReviewsController {
  constructor(private readonly reviewsService: ProductReviewsService) {}

  @Patch(':reviewId/visibility')
  setVisibility(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Body() dto: UpdateReviewVisibilityDto,
  ) {
    return this.reviewsService.setVisibility(reviewId, dto.isVisible);
  }
}
