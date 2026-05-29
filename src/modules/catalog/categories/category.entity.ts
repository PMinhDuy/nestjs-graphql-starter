import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm';

@ObjectType()
@Entity('categories')
@Tree('closure-table')
export class Category {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ unique: true })
  name: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', nullable: true })
  description?: string | null;

  @Field()
  @Column({ default: true })
  isActive: boolean;

  @Field(() => [Category], { nullable: true })
  @TreeChildren()
  children?: Category[];

  @Field(() => Category, { nullable: true })
  @TreeParent()
  parent?: Category | null;
}
