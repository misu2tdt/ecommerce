import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCartItemDto {
  @ApiProperty({
    type: 'integer',
    example: 1,
    minimum: 1,
    description: 'ProductVariant ID.',
  })
  @IsInt()
  @Min(1)
  variantId!: number;

  @ApiProperty({ type: 'integer', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}
