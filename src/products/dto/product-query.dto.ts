import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../catalog/dto-validation';

export class ProductQueryDto {
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  category?: string;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;
}
