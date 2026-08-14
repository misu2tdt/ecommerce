import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToOne,
} from 'typeorm';
import { UserRole } from './user-role.enum';
import { Cart } from '../../carts/entities/cart.entity';

@Entity('users') // Tên bảng trong Database sẽ là "users"
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true }) // Email không được phép trùng nhau
  email!: string;

  @Column({ type: 'varchar', select: false }) // Mật khẩu (sẽ được mã hóa)
  password!: string;

  @Column({ type: 'varchar', default: UserRole.USER }) // Mặc định ai đăng ký cũng là khách thường
  role!: UserRole;

  @OneToOne(() => Cart, (cart) => cart.user)
  cart?: Cart;

  @CreateDateColumn()
  createdAt!: Date;
}
