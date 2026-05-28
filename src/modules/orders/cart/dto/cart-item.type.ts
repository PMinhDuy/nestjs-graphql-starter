import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { Product } from '../../../catalog/products/product.entity';

@ObjectType()
export class CartItemType {
  @Field(() => ID)
  productId: string;

  @Field(() => Product, { nullable: true })
  product?: Product | null;

  @Field(() => Int)
  quantity: number;

  @Field(() => Float)
  subtotal: number;
}
