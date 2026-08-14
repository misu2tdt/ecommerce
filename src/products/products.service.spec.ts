import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { Brand } from '../brands/entities/brand.entity';
import { Category } from '../categories/entities/category.entity';
import { ImageStorageService } from '../image-storage/image-storage.service';
import { ProductImage } from './entities/product-image.entity';
import { ProductStatus } from './entities/product-status.enum';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const productsRepository = {
    existsBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };
  const categoriesRepository = { findOneBy: jest.fn() };
  const brandsRepository = { findOneBy: jest.fn() };
  const productImagesRepository = { find: jest.fn() };
  const imageStorage = { deleteImage: jest.fn() };
  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    productsRepository.existsBy.mockResolvedValue(false);
    productsRepository.create.mockImplementation((value) => value);
    productsRepository.save.mockImplementation(async (value) => value);
    productsRepository.delete.mockResolvedValue({ affected: 1 });
    productImagesRepository.find.mockResolvedValue([]);
    imageStorage.deleteImage.mockResolvedValue(undefined);
    categoriesRepository.findOneBy.mockResolvedValue({
      id: 10,
      slug: 'laptop',
    });
    brandsRepository.findOneBy.mockResolvedValue({ id: 20, slug: 'acme' });
    service = new ProductsService(
      productsRepository as unknown as Repository<Product>,
      categoriesRepository as unknown as Repository<Category>,
      brandsRepository as unknown as Repository<Brand>,
      productImagesRepository as unknown as Repository<ProductImage>,
      imageStorage as unknown as ImageStorageService,
    );
  });

  it('resolves relations and generates a stable slug on create', async () => {
    await expect(
      service.create({
        name: 'Gaming Laptop',
        categoryId: 10,
        brandId: 20,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        slug: 'gaming-laptop',
        categoryId: 10,
        brandId: 20,
        status: ProductStatus.ACTIVE,
      }),
    );
  });

  it('rejects a missing Category', async () => {
    categoriesRepository.findOneBy.mockResolvedValue(null);
    await expect(
      service.create({ name: 'Product', categoryId: 999 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(productsRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a missing Brand', async () => {
    brandsRepository.findOneBy.mockResolvedValue(null);
    await expect(
      service.create({
        name: 'Product',
        categoryId: 10,
        brandId: 999,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an existing Product slug', async () => {
    productsRepository.existsBy.mockResolvedValue(true);
    await expect(
      service.create({
        name: 'Gaming Laptop',
        categoryId: 10,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps a database unique race to ConflictException', async () => {
    productsRepository.save.mockRejectedValue(
      new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('duplicate slug'), { code: '23505' }),
      ),
    );
    await expect(
      service.create({
        name: 'Gaming Laptop',
        categoryId: 10,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('preserves slug when name is updated', async () => {
    const product = {
      id: 1,
      name: 'Old name',
      slug: 'stable-product-slug',
      category: { id: 10 },
      brand: null,
    } as Product;
    productsRepository.findOne.mockResolvedValue(product);

    await expect(service.update(1, { name: 'New name' })).resolves.toEqual(
      expect.objectContaining({
        name: 'New name',
        slug: 'stable-product-slug',
      }),
    );
  });

  it('explicitly removes Brand when brandId is null', async () => {
    const product = {
      id: 1,
      slug: 'product',
      category: { id: 10 },
      brandId: 20,
      brand: { id: 20 },
    } as Product;
    productsRepository.findOne.mockResolvedValue(product);

    await expect(service.update(1, { brandId: null })).resolves.toEqual(
      expect.objectContaining({ brandId: null, brand: null }),
    );
  });

  it('deletes Product before best-effort storage cleanup', async () => {
    productImagesRepository.find.mockResolvedValue([
      { id: 7, storageKey: 'ecommerce/products/1/image' },
    ]);

    await service.remove(1);

    expect(productsRepository.delete).toHaveBeenCalledWith(1);
    expect(imageStorage.deleteImage).toHaveBeenCalledWith(
      'ecommerce/products/1/image',
    );
    expect(productsRepository.delete.mock.invocationCallOrder[0]).toBeLessThan(
      imageStorage.deleteImage.mock.invocationCallOrder[0],
    );
  });

  it('keeps Product deletion successful when storage cleanup fails', async () => {
    const loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();
    productImagesRepository.find.mockResolvedValue([
      { id: 7, storageKey: 'ecommerce/products/1/orphan' },
    ]);
    imageStorage.deleteImage.mockRejectedValueOnce(new Error('cleanup failed'));

    await expect(service.remove(1)).resolves.toBeUndefined();
    expect(loggerErrorSpy).toHaveBeenCalled();
    loggerErrorSpy.mockRestore();
  });
});
