import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsUUID, IsInt, Min, Max } from 'class-validator';

@InputType()
export class AddToCartInput {
  @Field(() => ID)
  @IsUUID()
  productId: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(999)
  quantity: number;
}
