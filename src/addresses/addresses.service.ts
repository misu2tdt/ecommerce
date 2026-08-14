import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address } from './entities/address.entity';

@Injectable()
export class AddressesService {
  constructor(private readonly dataSource: DataSource) {}

  findAll(userId: number) {
    return this.dataSource.getRepository(Address).find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'ASC', id: 'ASC' },
    });
  }

  async create(userId: number, dto: CreateAddressDto) {
    return this.dataSource.transaction(async (manager) => {
      if (dto.isDefault) await this.lockUser(manager, userId);
      if (dto.isDefault) await this.unsetDefault(manager, userId);
      const repository = manager.getRepository(Address);
      return repository.save(
        repository.create({
          ...dto,
          userId,
          countryCode: dto.countryCode.trim().toUpperCase(),
          label: dto.label ?? null,
          addressLine2: dto.addressLine2 ?? null,
          ward: dto.ward ?? null,
          district: dto.district ?? null,
          stateProvince: dto.stateProvince ?? null,
          postalCode: dto.postalCode ?? null,
          isDefault: dto.isDefault ?? false,
        }),
      );
    });
  }

  async update(userId: number, id: number, dto: UpdateAddressDto) {
    return this.dataSource.transaction(async (manager) => {
      if (dto.isDefault) await this.lockUser(manager, userId);
      const repository = manager.getRepository(Address);
      const address = await repository.findOne({
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!address) throw new NotFoundException('Address not found');
      if (dto.isDefault) await this.unsetDefault(manager, userId);
      Object.assign(address, dto);
      if (dto.countryCode !== undefined)
        address.countryCode = dto.countryCode.trim().toUpperCase();
      return repository.save(address);
    });
  }

  async remove(userId: number, id: number) {
    const result = await this.dataSource
      .getRepository(Address)
      .delete({ id, userId });
    if (!result.affected) throw new NotFoundException('Address not found');
  }

  private async lockUser(manager: EntityManager, userId: number) {
    const user = await manager.getRepository(User).findOne({
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user) throw new NotFoundException('User not found');
  }

  private async unsetDefault(manager: EntityManager, userId: number) {
    await manager
      .getRepository(Address)
      .update({ userId, isDefault: true }, { isDefault: false });
  }
}
