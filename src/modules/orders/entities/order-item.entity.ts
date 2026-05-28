import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';
import { priceTransformer } from '../../../common/transformers/price.transformer';

@ObjectType()
@Entity('order_items')
export class OrderItem {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ID)
  @Column()
  @Index()
  orderId: string;

  @Field(() => ID)
  @Column()
  productId: string;

  @Field(() => Int)
  @Column()
  quantity: number;

  // Snapshot of price at time of order — product price may change after
  @Field(() => Float)
  @Column('decimal', { precision: 10, scale: 2, transformer: priceTransformer })
  unitPrice: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;
}
