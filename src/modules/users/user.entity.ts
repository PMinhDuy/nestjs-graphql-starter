import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { Address } from './address.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

registerEnumType(UserRole, { name: 'UserRole' });

@ObjectType()
@Entity('users')
export class User {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  password: string;

  @Field()
  @Column()
  name: string;

  @Field(() => UserRole)
  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Field()
  @Column({ default: true })
  isActive: boolean;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field(() => [Address], { nullable: true })
  @OneToMany(() => Address, (address) => address.user)
  addresses?: Address[];
}
