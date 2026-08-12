import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import {
  getDatabasePort,
  getRequiredConfig,
} from './config/environment';
import { OrderItem } from './orders/entities/order-item.entity';
import { Order } from './orders/entities/order.entity';
import { OrdersModule } from './orders/orders.module';
import { Product } from './products/entities/product.entity';
import { ProductsModule } from './products/products.module';
import { TelegramModule } from './telegram/telegram.module';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: getRequiredConfig(configService, 'DB_HOST'),
        port: getDatabasePort(configService),
        username: getRequiredConfig(configService, 'DB_USERNAME'),
        password: getRequiredConfig(configService, 'DB_PASSWORD'),
        database: getRequiredConfig(configService, 'DB_NAME'),
        entities: [User, Product, Order, OrderItem],
        // TODO Phase 0F: disable synchronize after migrations are added.
        synchronize: true,
      }),
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
