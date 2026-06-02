import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Product } from '../catalog/products/product.entity';

@ObjectType()
@Entity('wishlist_items')
@Unique(['userId', 'productId'])
export class WishlistItem {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ID)
  @Column()
  @Index()
  userId: string;

  @Field(() => ID)
  @Column()
  productId: string;

  @ManyToOne(() => Product, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
