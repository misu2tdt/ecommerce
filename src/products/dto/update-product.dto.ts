import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Trim } from '../../catalog/dto-validation';
import { ProductStatus } from '../entities/product-status.enum';

export class UpdateProductDto {
  @Trim()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @Trim()
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  brandId?: number | null;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
