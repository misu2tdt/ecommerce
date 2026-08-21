import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/entities/user-role.enum';
import { UpdateReviewVisibilityDto } from './dto/update-review-visibility.dto';
import { ProductReviewsService } from './product-reviews.service';

@Controller('admin/reviews')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiTags('Admin - Reviews')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Bearer JWT is missing or invalid.' })
@ApiForbiddenResponse({ description: 'ADMIN role required.' })
export class AdminReviewsController {
  constructor(private readonly reviewsService: ProductReviewsService) {}

  @Get()
  @ApiOperation({
    summary: 'List Product reviews for moderation',
    description:
      'ADMIN only. Includes visibility, reviewer ID, and safe Product context.',
  })
  findAll() {
    return this.reviewsService.findAllForAdmin();
  }

  @Patch(':reviewId/visibility')
  @ApiOperation({
    summary: 'Set public visibility of a Product review',
    description: 'ADMIN only.',
  })
  setVisibility(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Body() dto: UpdateReviewVisibilityDto,
  ) {
    return this.reviewsService.setVisibility(reviewId, dto.isVisible);
  }
}
