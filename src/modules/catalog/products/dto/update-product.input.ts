import { InputType, Field, Float, Int, ID } from '@nestjs/graphql';
import { IsString, IsNumber, Min, IsUUID, IsArray, IsOptional, IsBoolean, Matches } from 'class-validator';

@InputType()
export class UpdateProductInput {
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  name?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @Field(() => Int, { nullable: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;

  @Field(() => Int, { nullable: true })
  @IsNumber()
  @Min(1)
  @IsOptional()
  lowStockThreshold?: number;

  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsString({ each: true })
  @Matches(/^products\/[0-9a-f-]{36}\/.+$/, { each: true, message: 'Invalid image key format' })
  @IsOptional()
  imageKeys?: string[];

  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
