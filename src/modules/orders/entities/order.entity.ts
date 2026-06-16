import { ObjectType, Field, ID, Float, registerEnumType } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { priceTransformer } from '../../../common/transformers/price.transformer';

export enum OrderStatus {
  PENDING = 'pending',
  AWAITING_PAYMENT = 'awaiting_payment',
  PAYMENT_FAILED = 'payment_failed',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

registerEnumType(OrderStatus, { name: 'OrderStatus' });

@ObjectType()
@Entity('orders')
export class Order {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ID)
  @Column()
  @Index()
  userId: string;

  @Field(() => OrderStatus)
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Field(() => Float)
  @Column('decimal', { precision: 10, scale: 2, transformer: priceTransformer })
  totalAmount: number;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  shippingAddressId?: string | null;

  @Field(() => [OrderItem])
  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
