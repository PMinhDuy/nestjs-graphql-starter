import { InputType, Field, Float } from '@nestjs/graphql';
import { IsString, IsNumber, IsPositive, IsEnum, IsDateString } from 'class-validator';
import { TransactionType } from '../transaction.entity';

@InputType()
export class CreateTransactionInput {
  @Field(() => Float)
  @IsNumber()
  @IsPositive()
  amount: number;

  @Field()
  @IsString()
  description: string;

  @Field(() => TransactionType)
  @IsEnum(TransactionType)
  type: TransactionType;

  @Field()
  @IsDateString()
  date: string;
}
