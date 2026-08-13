import { NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
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
  let service: ProductImagesService;

  beforeEach(() => {
    jest.clearAllMocks();
    manager.exists.mockResolvedValue(true);
    manager.update.mockResolvedValue({ affected: 1 });
    manager.create.mockImplementation((_entity, value) => value);
    manager.save.mockImplementation(async (value) => value);
    imagesRepository.manager.exists.mockResolvedValue(true);
    service = new ProductImagesService(
      imagesRepository as unknown as Repository<ProductImage>,
      dataSource as unknown as DataSource,
    );
  });

  it('rejects create when Product is missing without saving', async () => {
    manager.exists.mockResolvedValue(false);

    await expect(
      service.createForProduct(999, { url: 'https://example.test/image.jpg' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(manager.save).not.toHaveBeenCalled();
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
    const image = { id: 2, productId: 1, isPrimary: true } as ProductImage;
    manager.findOne.mockResolvedValue(image);

    await service.removeForProduct(1, 2);

    expect(manager.remove).toHaveBeenCalledWith(image);
    expect(manager.update).not.toHaveBeenCalled();
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
