import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User, UserRole } from './user.entity';
import { Address } from './address.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { CreateAddressInput } from './dto/create-address.input';
import { UpdateAddressInput } from './dto/update-address.input';
import { CustomerProfile } from './dto/customer-profile.type';

type CreateUserInput = Pick<User, 'email' | 'password' | 'name'> & Partial<Pick<User, 'role'>>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
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

  // ─── Customer Management ──────────────────────────────────────────────────

  async getCustomers(search?: string, limit = 20, offset = 0): Promise<CustomerProfile[]> {
    const qb = this.userRepository
      .createQueryBuilder('u')
      .where('u.role = :role', { role: UserRole.USER });

    if (search) {
      qb.andWhere('(u.email ILIKE :s OR u.name ILIKE :s)', { s: `%${search}%` });
    }

    const users = await qb.orderBy('u.createdAt', 'DESC').skip(offset).take(limit).getMany();

    return Promise.all(users.map((user) => this.buildCustomerProfile(user)));
  }

  async getCustomer(id: string): Promise<CustomerProfile> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return this.buildCustomerProfile(user);
  }

  async deactivateUser(id: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    user.isActive = false;
    return this.userRepository.save(user);
  }

  private async buildCustomerProfile(user: User): Promise<CustomerProfile> {
    const stats = await this.orderRepository
      .createQueryBuilder('o')
      .select('COUNT(o.id)::int', 'totalOrders')
      .addSelect('COALESCE(SUM(o.totalAmount), 0)', 'totalSpent')
      .addSelect('MAX(o.createdAt)', 'lastOrderAt')
      .where('o.userId = :userId', { userId: user.id })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .getRawOne<{ totalOrders: number; totalSpent: string; lastOrderAt: string | null }>();

    return {
      user,
      totalOrders: stats?.totalOrders ?? 0,
      totalSpent: parseFloat(stats?.totalSpent ?? '0'),
      lastOrderAt: stats?.lastOrderAt ?? null,
    };
  }
}
