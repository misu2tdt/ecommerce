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
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Brand } from './entities/brand.entity';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandsRepository: Repository<Brand>,
  ) {}

  async create(dto: CreateBrandDto): Promise<Brand> {
    const slug = createSlug(dto.name);
    if (await this.brandsRepository.existsBy({ slug })) {
      throw new ConflictException('Brand slug already exists');
    }

    try {
      return await this.brandsRepository.save(
        this.brandsRepository.create({ ...dto, slug }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Brand slug already exists');
      }
      throw error;
    }
  }

  findAll(): Promise<Brand[]> {
    return this.brandsRepository.find({ order: { name: 'ASC' } });
  }

  async findBySlug(slug: string): Promise<Brand> {
    const brand = await this.brandsRepository.findOneBy({ slug });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async update(id: number, dto: UpdateBrandDto): Promise<Brand> {
    const brand = await this.brandsRepository.findOneBy({ id });
    if (!brand) throw new NotFoundException('Brand not found');

    Object.assign(brand, dto);
    return this.brandsRepository.save(brand);
  }

  async remove(id: number): Promise<void> {
    try {
      const result = await this.brandsRepository.delete(id);
      if (!result.affected) throw new NotFoundException('Brand not found');
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictException('Brand is in use by a Product');
      }
      throw error;
    }
  }
}
