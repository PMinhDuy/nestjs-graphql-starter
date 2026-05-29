import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@ObjectType()
@Entity('addresses')
export class Address {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  street: string;

  @Field()
  @Column()
  city: string;

  @Field()
  @Column()
  country: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', nullable: true })
  postalCode?: string | null;

  @Field()
  @Column({ default: false })
  isDefault: boolean;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
