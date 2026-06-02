import { Resolver, Mutation, Args, ID } from '@nestjs/graphql';
import { CurrentUser } from '../../common/decorators';
import { PaymentsService } from './payments.service';
import { User } from '../users/user.entity';

@Resolver()
export class PaymentsResolver {
  constructor(private paymentsService: PaymentsService) {}

  @Mutation(() => String, { description: 'Create a Stripe Checkout Session URL for the given order' })
  async createCheckoutSession(
    @Args('orderId', { type: () => ID }) orderId: string,
    @CurrentUser() user: User,
  ): Promise<string> {
    return this.paymentsService.createCheckoutSession(orderId, user.id);
  }
}
