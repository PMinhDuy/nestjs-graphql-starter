import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { Product } from '../../catalog/products/product.entity';

@ObjectType()
export class DashboardStats {
  @Field(() => Float)
  totalRevenue: number;

  @Field(() => Float)
  revenueThisMonth: number;

  @Field(() => Float)
  revenueLastMonth: number;

  @Field(() => Int)
  totalOrders: number;

  @Field(() => Int)
  pendingOrders: number;

  @Field(() => Int)
  totalProducts: number;

  @Field(() => Int)
  lowStockProducts: number;

  @Field(() => Int)
  totalCustomers: number;
}

@ObjectType()
export class RevenueDataPoint {
  @Field()
  date: string;

  @Field(() => Float)
  revenue: number;

  @Field(() => Int)
  orderCount: number;
}

@ObjectType()
export class TopProduct {
  @Field(() => Product)
  product: Product;

  @Field(() => Int)
  totalSold: number;

  @Field(() => Float)
  totalRevenue: number;
}
