import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config'; // 1. Bổ sung import ConfigModule
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { ProductsModule } from './products/products.module';
import { Product } from './products/entities/product.entity';
import { OrdersModule } from './orders/orders.module';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';
import { TelegramModule } from './telegram/telegram.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // 2. Kích hoạt ConfigModule để đọc biến môi trường từ file .env
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5434,
      username: 'postgres',
      password: '123456',
      database: 'postgres',
      // 3. SỬA ĐIỂM CHẾT: Khai báo đầy đủ cả 4 bản vẽ cho TypeORM
      entities: [User, Product, Order, OrderItem], 
      synchronize: true, 
    }),
    UsersModule,
    ProductsModule,
    OrdersModule,
    TelegramModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}