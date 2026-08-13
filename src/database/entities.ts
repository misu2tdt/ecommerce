import { Brand } from '../brands/entities/brand.entity';
import { Category } from '../categories/entities/category.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { ProductImage } from '../products/entities/product-image.entity';
import { User } from '../users/entities/user.entity';

export const databaseEntities = [
  User,
  Product,
  Order,
  OrderItem,
  Category,
  Brand,
  ProductImage,
];
