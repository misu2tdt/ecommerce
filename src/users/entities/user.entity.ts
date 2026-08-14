import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Address } from '../../addresses/entities/address.entity';
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

  @OneToMany(() => Address, (address) => address.user)
  addresses?: Address[];

  @CreateDateColumn()
  createdAt!: Date;
}
