import { ArgsType, Field, Int, ID } from '@nestjs/graphql';
import { IsOptional, Min, Max, MaxLength, IsIn } from 'class-validator';

@ArgsType()
export class ProductsArgs {
  @Field(() => Int, { defaultValue: 20 })
  @Min(1)
  @Max(100)
  limit: number;

  @Field(() => Int, { defaultValue: 0 })
  @Min(0)
  offset: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(200)
  search?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  categoryId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  sortBy?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: string;
}
