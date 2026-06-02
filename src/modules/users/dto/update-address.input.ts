import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateAddressInput {
  @Field(() => String, { nullable: true })
  street?: string;

  @Field(() => String, { nullable: true })
  city?: string;

  @Field(() => String, { nullable: true })
  country?: string;

  @Field(() => String, { nullable: true })
  postalCode?: string | null;

  @Field(() => Boolean, { nullable: true })
  isDefault?: boolean;
}
