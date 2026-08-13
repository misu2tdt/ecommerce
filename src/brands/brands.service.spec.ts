import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { BrandsService } from './brands.service';
import { Brand } from './entities/brand.entity';

describe('BrandsService', () => {
  const repository = {
    existsBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
  };
  let service: BrandsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.existsBy.mockResolvedValue(false);
    repository.create.mockImplementation((value) => value);
    repository.save.mockImplementation(async (value) => value);
    service = new BrandsService(repository as unknown as Repository<Brand>);
  });

  it('generates a normalized slug on create', async () => {
    await expect(service.create({ name: 'Điện Tử' })).resolves.toEqual(
      expect.objectContaining({ name: 'Điện Tử', slug: 'dien-tu' }),
    );
  });

  it('rejects an existing generated slug', async () => {
    repository.existsBy.mockResolvedValue(true);
    await expect(service.create({ name: 'Acme' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects a name that normalizes to an empty slug before saving', async () => {
    await expect(service.create({ name: '???' })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('maps a database unique race to ConflictException', async () => {
    repository.save.mockRejectedValue(
      new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('duplicate slug'), { code: '23505' }),
      ),
    );
    await expect(service.create({ name: 'Acme' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects a missing slug', async () => {
    repository.findOneBy.mockResolvedValue(null);
    await expect(service.findBySlug('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('preserves slug when name is updated', async () => {
    const brand = { id: 1, name: 'Old', slug: 'stable-slug' } as Brand;
    repository.findOneBy.mockResolvedValue(brand);
    await expect(service.update(1, { name: 'New' })).resolves.toEqual(
      expect.objectContaining({ name: 'New', slug: 'stable-slug' }),
    );
  });

  it('maps a referenced delete FK violation to ConflictException', async () => {
    repository.delete.mockRejectedValue(
      new QueryFailedError(
        'DELETE',
        [],
        Object.assign(new Error('referenced'), { code: '23503' }),
      ),
    );
    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
  });
});
