import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateAddressInput {
  @Field()
  street: string;

  @Field()
  city: string;

  @Field()
  country: string;

  @Field(() => String, { nullable: true })
  postalCode?: string | null;

  @Field({ defaultValue: false })
  isDefault: boolean;
}
