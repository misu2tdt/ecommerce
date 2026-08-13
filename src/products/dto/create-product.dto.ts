import {
  IsInt,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Trim } from '../../catalog/dto-validation';
import { ProductStatus } from '../entities/product-status.enum';

export class CreateProductDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price!: number;

  @IsInt()
  @Min(0)
  stock!: number;

  @IsInt()
  @Min(1)
  categoryId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  brandId?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
