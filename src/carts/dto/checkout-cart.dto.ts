import { IsInt, Min } from 'class-validator';

export class CheckoutCartDto {
  @IsInt()
  @Min(1)
  addressId!: number;
}
