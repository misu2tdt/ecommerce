import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(AuthGuard)
@ApiTags('Orders')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Bearer JWT is missing or invalid.' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @ApiBadRequestResponse({
    description: 'Invalid, inactive, or insufficient-stock ProductVariant.',
  })
  @ApiNotFoundResponse({ description: 'Owned Address not found.' })
  @ApiOperation({
    summary: 'Create an Order by direct checkout',
    description:
      'Validates and decrements current ProductVariant stock transactionally. The saved Address is copied into an immutable shipping snapshot.',
  })
  checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.checkout(user.id, createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'List the current user’s Orders' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findAllForUser(user.id);
  }

  @Post(':id/cancel')
  @ApiConflictResponse({
    description: 'A succeeded Payment prevents cancellation.',
  })
  @ApiNotFoundResponse({ description: 'Owned Order not found.' })
  @ApiOperation({
    summary: 'Cancel an owned Order',
    description:
      'A succeeded/paid Order cannot be cancelled because refund support is not implemented.',
  })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.cancelForUser(user.id, id);
  }

  @Get(':id')
  @ApiNotFoundResponse({ description: 'Owned Order not found.' })
  @ApiOperation({ summary: 'Get an owned Order' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.findOneForUser(user.id, id);
  }
}
