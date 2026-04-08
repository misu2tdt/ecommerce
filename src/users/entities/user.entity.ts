import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('users') // Tên bảng trong Database sẽ là "users"
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true }) // Email không được phép trùng nhau
  email!: string;

  @Column({ type: 'varchar' }) // Mật khẩu (sẽ được mã hóa thành chuỗi lằng nhằng)
  password!: string;

  @Column({ type: 'varchar', default: 'user' }) // Mặc định ai đăng ký cũng là khách thường (user)
  role!: string;

  @CreateDateColumn()
  createdAt!: Date;
}