import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './user.entity';
import { Address } from './address.entity';
import { CreateAddressInput } from './dto/create-address.input';
import { UpdateAddressInput } from './dto/update-address.input';

type CreateUserInput = Pick<User, 'email' | 'password' | 'name'> & Partial<Pick<User, 'role'>>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const user = this.userRepository.create(input);
    return this.userRepository.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByIds(ids: string[]): Promise<User[]> {
    return this.userRepository.find({ where: { id: In(ids) } });
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  // ─── Address CRUD ─────────────────────────────────────────────────────────

  async findAddressesByUserId(userId: string): Promise<Address[]> {
    return this.addressRepository.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  async addAddress(userId: string, input: CreateAddressInput): Promise<Address> {
    if (input.isDefault) {
      await this.addressRepository.update({ userId }, { isDefault: false });
    }
    const address = this.addressRepository.create({ ...input, userId });
    return this.addressRepository.save(address);
  }

  async updateAddress(userId: string, id: string, input: UpdateAddressInput): Promise<Address> {
    const address = await this.addressRepository.findOneBy({ id });
    if (!address) throw new NotFoundException(`Address ${id} not found`);
    if (address.userId !== userId) throw new ForbiddenException('Access denied');

    if (input.isDefault) {
      await this.addressRepository.update({ userId }, { isDefault: false });
    }
    Object.assign(address, input);
    return this.addressRepository.save(address);
  }

  async removeAddress(userId: string, id: string): Promise<boolean> {
    const address = await this.addressRepository.findOneBy({ id });
    if (!address) throw new NotFoundException(`Address ${id} not found`);
    if (address.userId !== userId) throw new ForbiddenException('Access denied');
    await this.addressRepository.remove(address);
    return true;
  }

  async setDefaultAddress(userId: string, id: string): Promise<Address> {
    const address = await this.addressRepository.findOneBy({ id });
    if (!address) throw new NotFoundException(`Address ${id} not found`);
    if (address.userId !== userId) throw new ForbiddenException('Access denied');

    await this.addressRepository.update({ userId }, { isDefault: false });
    address.isDefault = true;
    return this.addressRepository.save(address);
  }
}
