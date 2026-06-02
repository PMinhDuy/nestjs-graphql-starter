import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UserRole } from '../users/user.entity';
import { Roles } from '../../common/decorators';
import { AnalyticsService } from './analytics.service';
import { DashboardStats, RevenueDataPoint, TopProduct } from './dto/analytics.types';
import { Product } from '../catalog/products/product.entity';

@Resolver()
export class AnalyticsResolver {
  constructor(private analyticsService: AnalyticsService) {}

  @Roles(UserRole.ADMIN)
  @Query(() => DashboardStats)
  async dashboardStats(): Promise<DashboardStats> {
    return this.analyticsService.getDashboardStats();
  }

  @Roles(UserRole.ADMIN)
  @Query(() => [RevenueDataPoint])
  async revenueChart(
    @Args('days', { type: () => Int, defaultValue: 30 }) days: number,
  ): Promise<RevenueDataPoint[]> {
    return this.analyticsService.getRevenueChart(days);
  }

  @Roles(UserRole.ADMIN)
  @Query(() => [TopProduct])
  async topProducts(
    @Args('limit', { type: () => Int, defaultValue: 5 }) limit: number,
  ): Promise<TopProduct[]> {
    return this.analyticsService.getTopProducts(limit);
  }

  @Roles(UserRole.ADMIN)
  @Query(() => [Product])
  async lowStockProducts(
    @Args('threshold', { type: () => Int, nullable: true }) threshold?: number,
  ): Promise<Product[]> {
    return this.analyticsService.getLowStockProducts(threshold);
  }
}
