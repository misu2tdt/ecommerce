import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('addresses')
@Index('UQ_addresses_user_default', ['userId'], {
  unique: true,
  where: '"isDefault" = true',
})
export class Address {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  userId!: number;

  @ManyToOne(() => User, (user) => user.addresses, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId', foreignKeyConstraintName: 'FK_addresses_user' })
  user!: User;

  @Column({ type: 'varchar', length: 100, nullable: true })
  label!: string | null;

  @Column({ type: 'varchar', length: 150 })
  recipientName!: string;

  @Column({ type: 'varchar', length: 32 })
  phone!: string;

  @Column({ type: 'varchar', length: 255 })
  addressLine1!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  addressLine2!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  ward!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  district!: string | null;

  @Column({ type: 'varchar', length: 150 })
  city!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  stateProvince!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  postalCode!: string | null;

  @Column({ type: 'char', length: 2 })
  countryCode!: string;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
