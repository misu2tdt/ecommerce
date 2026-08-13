import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ImageStorageService } from '../image-storage/image-storage.service';
import { ProductImage } from './entities/product-image.entity';
import { ProductImagesService } from './product-images.service';

describe('ProductImagesService', () => {
  const manager = {
    exists: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn((work: (manager: EntityManager) => unknown) =>
      work(manager as unknown as EntityManager),
    ),
  };
  const imagesRepository = {
    manager: { exists: jest.fn() },
    find: jest.fn(),
  };
  const imageStorage = {
    uploadProductImage: jest.fn(),
    deleteImage: jest.fn(),
  };
  const validFile = {
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
    mimetype: 'image/jpeg',
    size: 4,
  };
  let service: ProductImagesService;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    manager.exists.mockResolvedValue(true);
    manager.update.mockResolvedValue({ affected: 1 });
    manager.create.mockImplementation((_entity, value) => value);
    manager.save.mockImplementation(async (value) => value);
    imagesRepository.manager.exists.mockResolvedValue(true);
    imageStorage.uploadProductImage.mockResolvedValue({
      url: 'https://res.cloudinary.com/demo/image.jpg',
      storageKey: 'ecommerce/products/1/image',
    });
    imageStorage.deleteImage.mockResolvedValue(undefined);
    service = new ProductImagesService(
      imagesRepository as unknown as Repository<ProductImage>,
      dataSource as unknown as DataSource,
      imageStorage as unknown as ImageStorageService,
    );
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => loggerErrorSpy.mockRestore());

  it('rejects upload when Product is missing without calling storage', async () => {
    imagesRepository.manager.exists.mockResolvedValue(false);

    await expect(
      service.uploadForProduct(999, {}, validFile),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(imageStorage.uploadProductImage).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('rejects invalid image content without calling storage', async () => {
    await expect(
      service.uploadForProduct(
        1,
        {},
        {
          buffer: Buffer.from('not an image'),
          mimetype: 'image/png',
          size: 12,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(imageStorage.uploadProductImage).not.toHaveBeenCalled();
  });

  it('rejects a missing file without calling storage', async () => {
    await expect(
      service.uploadForProduct(1, {}, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(imageStorage.uploadProductImage).not.toHaveBeenCalled();
  });

  it('rejects an oversized image without calling storage', async () => {
    await expect(
      service.uploadForProduct(
        1,
        {},
        { ...validFile, size: 5 * 1024 * 1024 + 1 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(imageStorage.uploadProductImage).not.toHaveBeenCalled();
  });

  it('persists the server-controlled URL and storage key', async () => {
    await service.uploadForProduct(1, { altText: 'Front view' }, validFile);

    expect(imageStorage.uploadProductImage).toHaveBeenCalledWith(1, validFile);
    expect(manager.create).toHaveBeenCalledWith(
      ProductImage,
      expect.objectContaining({
        url: 'https://res.cloudinary.com/demo/image.jpg',
        storageKey: 'ecommerce/products/1/image',
        altText: 'Front view',
      }),
    );
  });

  it('compensates an upload when DB persistence fails', async () => {
    const originalError = new Error('database failed');
    manager.save.mockRejectedValueOnce(originalError);

    await expect(service.uploadForProduct(1, {}, validFile)).rejects.toBe(
      originalError,
    );
    expect(imageStorage.deleteImage).toHaveBeenCalledWith(
      'ecommerce/products/1/image',
    );
  });

  it('preserves the original DB error when compensation also fails', async () => {
    const originalError = new Error('database failed');
    manager.save.mockRejectedValueOnce(originalError);
    imageStorage.deleteImage.mockRejectedValueOnce(new Error('cleanup failed'));

    await expect(service.uploadForProduct(1, {}, validFile)).rejects.toBe(
      originalError,
    );
    expect(loggerErrorSpy).toHaveBeenCalled();
  });

  it('enforces image ownership on update', async () => {
    manager.findOne.mockResolvedValue(null);

    await expect(
      service.updateForProduct(1, 22, { altText: 'Wrong owner' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('unsets the previous primary inside the transaction before saving the selected image', async () => {
    const image = { id: 2, productId: 1, isPrimary: false } as ProductImage;
    manager.findOne.mockResolvedValue(image);

    await service.updateForProduct(1, 2, { isPrimary: true });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(manager.update).toHaveBeenCalledWith(
      ProductImage,
      { productId: 1, isPrimary: true },
      { isPrimary: false },
    );
    expect(manager.update.mock.invocationCallOrder[0]).toBeLessThan(
      manager.save.mock.invocationCallOrder[0],
    );
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2, isPrimary: true }),
    );
  });

  it('deletes a primary image without promoting another image', async () => {
    const image = {
      id: 2,
      productId: 1,
      isPrimary: true,
      storageKey: 'ecommerce/products/1/primary',
    } as ProductImage;
    manager.findOne.mockResolvedValue(image);

    await service.removeForProduct(1, 2);

    expect(manager.remove).toHaveBeenCalledWith(image);
    expect(manager.update).not.toHaveBeenCalled();
    expect(imageStorage.deleteImage).toHaveBeenCalledWith(image.storageKey);
    expect(manager.remove.mock.invocationCallOrder[0]).toBeLessThan(
      imageStorage.deleteImage.mock.invocationCallOrder[0],
    );
  });

  it('keeps DB deletion successful when provider cleanup fails', async () => {
    const image = {
      id: 3,
      productId: 1,
      isPrimary: false,
      storageKey: 'ecommerce/products/1/orphan',
    } as ProductImage;
    manager.findOne.mockResolvedValue(image);
    imageStorage.deleteImage.mockRejectedValueOnce(new Error('cleanup failed'));

    await expect(service.removeForProduct(1, 3)).resolves.toBeUndefined();
    expect(manager.remove).toHaveBeenCalledWith(image);
    expect(loggerErrorSpy).toHaveBeenCalled();
  });

  it('uses deterministic primary, position and id ordering', async () => {
    imagesRepository.find.mockResolvedValue([]);

    await service.findForProduct(1);

    expect(imagesRepository.find).toHaveBeenCalledWith({
      where: { productId: 1 },
      order: { isPrimary: 'DESC', position: 'ASC', id: 'ASC' },
    });
  });
});
