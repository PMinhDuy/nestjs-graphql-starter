import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

@InputType()
export class UpdateCategoryInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  name?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
