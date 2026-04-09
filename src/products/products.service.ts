import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  // Hàm 1: Thêm sản phẩm mới lên kệ
  async create(createProductDto: CreateProductDto) {
    // create() chỉ tạo ra bản nháp, save() mới chính thức ghi vào Database
    const newProduct = this.productsRepository.create(createProductDto);
    return await this.productsRepository.save(newProduct);
  }

  // Hàm 2: Lấy danh sách toàn bộ sản phẩm đang bán
  async findAll() {
    return await this.productsRepository.find();
  }
}