import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

@ObjectType()
@Entity('reviews')
@Unique(['userId', 'productId'])
export class Review {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ID)
  @Column()
  @Index()
  userId: string;

  @Field(() => ID)
  @Column()
  @Index()
  productId: string;

  @Field(() => ID)
  @Column()
  orderId: string;

  @Field(() => Int)
  @Column({ type: 'int' })
  rating: number;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
