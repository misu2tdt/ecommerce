import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../catalog/dto-validation';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBrandDto {
  @ApiProperty({ example: 'Example Technologies', maxLength: 255 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    example: 'A fictional consumer electronics brand.',
    maxLength: 2000,
  })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
