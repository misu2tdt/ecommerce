import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { AuthModule } from '../auth/auth.module';
import { AdminOrdersController } from './admin-orders.controller';

@Module({
  // Thêm Product vào chung mảng với Order và OrderItem
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product]), AuthModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
