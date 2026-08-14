import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const upperTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateAddressDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label?: string | null;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  recipientName!: string;

  @Transform(trim)
  @IsString()
  @Matches(/^[+0-9][0-9 ()-]{5,31}$/)
  phone!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  addressLine1!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  addressLine2?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  ward?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  district?: string | null;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  city!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  stateProvince?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  postalCode?: string | null;

  @Transform(upperTrim)
  @Matches(/^[A-Z]{2}$/)
  countryCode!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
