import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './user.entity';

type CreateUserInput = Pick<User, 'email' | 'password' | 'name'> & Partial<Pick<User, 'role'>>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
}
