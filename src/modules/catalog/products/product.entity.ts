import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Category } from '../categories/category.entity';
import { priceTransformer } from '../../../common/transformers/price.transformer';

@ObjectType()
@Entity('products')
export class Product {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  name: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Field(() => Float)
  @Column('decimal', { precision: 10, scale: 2, transformer: priceTransformer })
  price: number;

  @Field(() => Int)
  @Column({ default: 0 })
  stock: number;

  // S3 object keys — resolved to signed URLs at query time via @ResolveField
  @Field(() => [String])
  @Column({ type: 'text', array: true, default: '{}' })
  imageKeys: string[];

  @Field()
  @Column({ default: true })
  isActive: boolean;

  @Field(() => ID)
  @Column()
  @Index()
  categoryId: string;

  @ManyToOne(() => Category, { eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
