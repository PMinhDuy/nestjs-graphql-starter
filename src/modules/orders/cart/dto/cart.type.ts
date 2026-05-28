import { ObjectType, Field, Float } from '@nestjs/graphql';
import { CartItemType } from './cart-item.type';

@ObjectType()
export class CartType {
  @Field(() => [CartItemType])
  items: CartItemType[];

  @Field(() => Float)
  total: number;
}
