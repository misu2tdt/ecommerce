import { Controller, Get, Post, Body } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // API dành cho Admin: POST http://localhost:3000/products
  @Post()
  async create(@Body() createProductDto: CreateProductDto) {
    return await this.productsService.create(createProductDto);
  }

  // API dành cho Khách hàng: GET http://localhost:3000/products
  @Get()
  async findAll() {
    return await this.productsService.findAll();
  }
}