import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { User } from '../user.entity';

@ObjectType()
export class CustomerProfile {
  @Field(() => User)
  user: User;

  @Field(() => Int)
  totalOrders: number;

  @Field(() => Float)
  totalSpent: number;

  @Field(() => String, { nullable: true })
  lastOrderAt?: string | null;
}
