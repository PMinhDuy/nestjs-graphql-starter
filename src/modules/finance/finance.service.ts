import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './transaction.entity';
import { CreateTransactionInput } from './dto/create-transaction.input';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  async create(input: CreateTransactionInput, userId: string): Promise<Transaction> {
    const transaction = this.transactionRepository.create({
      ...input,
      date: new Date(input.date),
      userId,
    });
    return this.transactionRepository.save(transaction);
  }

  async findByUserId(userId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { userId },
      order: { date: 'DESC' },
    });
  }

  async findById(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({ where: { id } });
    if (!transaction) throw new NotFoundException(`Transaction ${id} not found`);
    return transaction;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const transaction = await this.findById(id);
    if (transaction.userId !== userId) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    await this.transactionRepository.remove(transaction);
    return true;
  }
}
