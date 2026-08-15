import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutCartDto {
  @ApiProperty({
    type: 'integer',
    example: 1,
    minimum: 1,
    description: 'Owned saved Address ID.',
  })
  @IsInt()
  @Min(1)
  addressId!: number;
}
