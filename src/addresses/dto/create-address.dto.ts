import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const upperTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'Home', maxLength: 100, nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label?: string | null;

  @ApiProperty({ example: 'Nguyen Van A', maxLength: 150 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  recipientName!: string;

  @ApiProperty({ example: '+84901234567', maxLength: 32 })
  @Transform(trim)
  @IsString()
  @Matches(/^[+0-9][0-9 ()-]{5,31}$/)
  phone!: string;

  @ApiProperty({ example: '123 Example Street', maxLength: 255 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  addressLine1!: string;

  @ApiPropertyOptional({ example: 'Apartment 4B', nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  addressLine2?: string | null;

  @ApiPropertyOptional({ example: 'Example Ward', nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  ward?: string | null;

  @ApiPropertyOptional({ example: 'Example District', nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  district?: string | null;

  @ApiProperty({ example: 'Ho Chi Minh City', maxLength: 150 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  city!: string;

  @ApiPropertyOptional({ example: 'Ho Chi Minh', nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  stateProvince?: string | null;

  @ApiPropertyOptional({ example: '700000', nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  postalCode?: string | null;

  @ApiProperty({ example: 'VN', minLength: 2, maxLength: 2 })
  @Transform(upperTrim)
  @Matches(/^[A-Z]{2}$/)
  countryCode!: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
