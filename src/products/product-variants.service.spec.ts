import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from './entities/product.entity';
import { ProductVariantsService } from './product-variants.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';

describe('ProductVariantsService', () => {
  const variants = {
    existsBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
  };
  const products = { existsBy: jest.fn() };
  let service: ProductVariantsService;
  beforeEach(() => {
    jest.clearAllMocks();
    products.existsBy.mockResolvedValue(true);
    variants.existsBy.mockResolvedValue(false);
    variants.create.mockImplementation((value) => value);
    variants.save.mockImplementation(async (value) => value);
    service = new ProductVariantsService(
      variants as unknown as Repository<ProductVariant>,
      products as unknown as Repository<Product>,
    );
  });

  it('normalizes SKU and creates for Product', async () => {
    await expect(
      service.createForProduct(1, {
        sku: ' ip17-blk ',
        name: 'Black',
        price: 24_990_000,
        stock: 2,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        sku: 'IP17-BLK',
        productId: 1,
        attributes: {},
      }),
    );
  });
  it('rejects missing Product', async () => {
    products.existsBy.mockResolvedValue(false);
    await expect(
      service.createForProduct(1, {
        sku: 'SKU',
        name: 'Default',
        price: 1,
        stock: 0,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('maps duplicate SKU precheck and database race to 409', async () => {
    variants.existsBy.mockResolvedValue(true);
    await expect(
      service.createForProduct(1, {
        sku: 'SKU',
        name: 'Default',
        price: 1,
        stock: 0,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    variants.existsBy.mockResolvedValue(false);
    variants.save.mockRejectedValue(
      new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error(), { code: '23505' }),
      ),
    );
    await expect(
      service.createForProduct(1, {
        sku: 'SKU',
        name: 'Default',
        price: 1,
        stock: 0,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('enforces ownership on update', async () => {
    variants.findOneBy.mockResolvedValue(null);
    await expect(
      service.updateForProduct(1, 2, { name: 'Updated' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('maps referenced delete to 409', async () => {
    variants.delete.mockRejectedValue(
      new QueryFailedError(
        'DELETE',
        [],
        Object.assign(new Error(), { code: '23503' }),
      ),
    );
    await expect(service.removeForProduct(1, 2)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects negative price, stock and position through DTO validation', async () => {
    const dto = plainToInstance(CreateProductVariantDto, {
      sku: 'SKU',
      name: 'Default',
      price: -1,
      stock: -1,
      position: -1,
    });
    await expect(validate(dto)).resolves.toHaveLength(3);
  });

  it('accepts whole VND and rejects fractional Variant prices', async () => {
    const integer = plainToInstance(CreateProductVariantDto, {
      sku: 'VND-INTEGER',
      name: 'Integer VND',
      price: 24_990_000,
      stock: 1,
    });
    const fractional = plainToInstance(CreateProductVariantDto, {
      sku: 'VND-FRACTION',
      name: 'Fractional VND',
      price: 24_999.5,
      stock: 1,
    });
    const numericString = plainToInstance(CreateProductVariantDto, {
      sku: 'VND-STRING',
      name: 'String VND',
      price: '24990000',
      stock: 1,
    });

    await expect(validate(integer)).resolves.toHaveLength(0);
    const errors = await validate(fractional);
    expect(errors.some((error) => error.property === 'price')).toBe(true);
    const stringErrors = await validate(numericString);
    expect(stringErrors.some((error) => error.property === 'price')).toBe(true);
  });

  it('rejects nested or non-string attributes', async () => {
    const dto = plainToInstance(CreateProductVariantDto, {
      sku: 'SKU',
      name: 'Default',
      price: 1,
      stock: 0,
      attributes: { color: { nested: true }, size: 42 },
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'attributes')).toBe(true);
  });
});
