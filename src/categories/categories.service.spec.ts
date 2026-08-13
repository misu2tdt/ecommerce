import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';

describe('CategoriesService', () => {
  const repository = {
    existsBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
  };
  let service: CategoriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.existsBy.mockResolvedValue(false);
    repository.create.mockImplementation((value) => value);
    repository.save.mockImplementation(async (value) => value);
    service = new CategoriesService(
      repository as unknown as Repository<Category>,
    );
  });

  it('generates a normalized slug on create', async () => {
    await expect(service.create({ name: 'Điện Thoại' })).resolves.toEqual(
      expect.objectContaining({ name: 'Điện Thoại', slug: 'dien-thoai' }),
    );
  });

  it('rejects an existing generated slug', async () => {
    repository.existsBy.mockResolvedValue(true);
    await expect(
      service.create({ name: 'Gaming Laptop' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a name that normalizes to an empty slug before saving', async () => {
    await expect(service.create({ name: '🔥🔥🔥' })).rejects.toBeInstanceOf(
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
    await expect(
      service.create({ name: 'Gaming Laptop' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a missing slug', async () => {
    repository.findOneBy.mockResolvedValue(null);
    await expect(service.findBySlug('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('preserves slug when name is updated', async () => {
    const category = { id: 1, name: 'Old', slug: 'stable-slug' } as Category;
    repository.findOneBy.mockResolvedValue(category);
    await expect(service.update(1, { name: 'New' })).resolves.toEqual(
      expect.objectContaining({ name: 'New', slug: 'stable-slug' }),
    );
  });
});
