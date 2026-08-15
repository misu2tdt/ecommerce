import {
  IsInt,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Trim } from '../../catalog/dto-validation';
import { ProductStatus } from '../entities/product-status.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Example Laptop' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'A fictional catalog product.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: 'integer', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  categoryId!: number;

  @ApiPropertyOptional({ type: 'integer', example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  brandId?: number;

  @ApiPropertyOptional({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
