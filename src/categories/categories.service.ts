import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../catalog/database-errors';
import { createSlug } from '../catalog/slug';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = createSlug(dto.name);
    if (await this.categoriesRepository.existsBy({ slug })) {
      throw new ConflictException('Category slug already exists');
    }

    try {
      return await this.categoriesRepository.save(
        this.categoriesRepository.create({ ...dto, slug }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Category slug already exists');
      }
      throw error;
    }
  }

  findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({ order: { name: 'ASC' } });
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoriesRepository.findOneBy({ slug });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.categoriesRepository.findOneBy({ id });
    if (!category) throw new NotFoundException('Category not found');

    Object.assign(category, dto);
    return this.categoriesRepository.save(category);
  }

  async remove(id: number): Promise<void> {
    try {
      const result = await this.categoriesRepository.delete(id);
      if (!result.affected) throw new NotFoundException('Category not found');
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictException('Category is in use by a Product');
      }
      throw error;
    }
  }
}
