import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity';
import { FinanceService } from './finance.service';
import { FinanceResolver } from './finance.resolver';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction]), UsersModule],
  providers: [FinanceService, FinanceResolver],
})
export class FinanceModule {}
