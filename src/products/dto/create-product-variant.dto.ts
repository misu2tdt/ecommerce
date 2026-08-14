import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { Trim } from '../../catalog/dto-validation';
import { VND_MAX_AMOUNT } from '../../money/vnd-money';

export class CreateProductVariantDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  sku!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsInt()
  @Min(0)
  @Max(VND_MAX_AMOUNT)
  price!: number;

  @IsInt()
  @Min(0)
  stock!: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => normalizeAttributes(value))
  @IsObject()
  @IsStringRecord()
  attributes?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

function IsStringRecord(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isStringRecord',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          return (
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value) &&
            Object.entries(value).every(
              ([key, item]) => key.length > 0 && typeof item === 'string',
            )
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must contain only string keys and values`;
        },
      },
    });
}

function normalizeAttributes(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key.trim(),
      typeof item === 'string' ? item.trim() : item,
    ]),
  );
}
