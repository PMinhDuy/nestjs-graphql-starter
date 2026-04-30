import { Resolver, Query, Mutation, Args, ResolveField, Parent, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Transaction } from './transaction.entity';
import { FinanceService } from './finance.service';
import { CreateTransactionInput } from './dto/create-transaction.input';
import { UsersDataLoader } from '../users/users.dataloader';
import { User } from '../users/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';

@Resolver(() => Transaction)
@UseGuards(JwtAuthGuard)
export class FinanceResolver {
  constructor(
    private financeService: FinanceService,
    private usersDataLoader: UsersDataLoader,
  ) {}

  @Query(() => [Transaction])
  async myTransactions(@CurrentUser() user: User): Promise<Transaction[]> {
    return this.financeService.findByUserId(user.id);
  }

  @Mutation(() => Transaction)
  async createTransaction(
    @Args('input') input: CreateTransactionInput,
    @CurrentUser() user: User,
  ): Promise<Transaction> {
    return this.financeService.create(input, user.id);
  }

  @Mutation(() => Boolean)
  async deleteTransaction(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    return this.financeService.delete(id, user.id);
  }

  @ResolveField(() => User)
  async user(@Parent() transaction: Transaction): Promise<User> {
    return this.usersDataLoader.batchUsers.load(transaction.userId);
  }
}
