import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { createDatabaseOptions } from './database/database-options';
import { databaseEntities } from './database/entities';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { TelegramModule } from './telegram/telegram.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...createDatabaseOptions((key) => configService.get(key)),
        entities: databaseEntities,
        // TODO Phase 0F2: set synchronize to false after initial migration is established.
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
