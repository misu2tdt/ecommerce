import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../catalog/dto-validation';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProductQueryDto {
  @ApiPropertyOptional({ example: 'laptops', description: 'Category slug.' })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  category?: string;

  @ApiPropertyOptional({
    example: 'example-technologies',
    description: 'Brand slug.',
  })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string;

  @ApiPropertyOptional({
    example: 'laptop',
    description: 'Product name search.',
  })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;
}
