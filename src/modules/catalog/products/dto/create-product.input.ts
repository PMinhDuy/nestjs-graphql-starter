import { InputType, Field, Float, Int, ID } from '@nestjs/graphql';
import { IsString, IsNumber, Min, IsUUID, IsArray, IsOptional, Matches } from 'class-validator';

@InputType()
export class CreateProductInput {
  @Field()
  @IsString()
  name: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  price: number;

  @Field(() => Int)
  @IsNumber()
  @Min(0)
  stock: number;

  @Field(() => Int, { nullable: true })
  @IsNumber()
  @Min(1)
  @IsOptional()
  lowStockThreshold?: number;

  @Field(() => ID)
  @IsUUID()
  categoryId: string;

  @Field(() => [String], { defaultValue: [] })
  @IsArray()
  @IsString({ each: true })
  @Matches(/^products\/[0-9a-f-]{36}\/.+$/, { each: true, message: 'Invalid image key format' })
  @IsOptional()
  imageKeys?: string[];
}
