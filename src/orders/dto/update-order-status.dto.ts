import { IsEnum } from 'class-validator';
import { OrderStatus } from '../entities/order-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.PROCESSING,
    description:
      'Lifecycle: pending → confirmed → processing → shipped → delivered; cancellation is allowed only by current domain rules.',
  })
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
