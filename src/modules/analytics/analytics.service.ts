import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../catalog/products/product.entity';
import { User } from '../users/user.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [totalRevenue, revenueThisMonth, revenueLastMonth, totalOrders, pendingOrders, totalProducts, lowStockProducts, totalCustomers] =
      await Promise.all([
        // Total revenue (DELIVERED orders only)
        this.orderRepo
          .createQueryBuilder('o')
          .select('COALESCE(SUM(o.totalAmount), 0)', 'revenue')
          .where('o.status = :status', { status: OrderStatus.DELIVERED })
          .getRawOne<{ revenue: string }>(),

        // Revenue this month
        this.orderRepo
          .createQueryBuilder('o')
          .select('COALESCE(SUM(o.totalAmount), 0)', 'revenue')
          .where('o.status = :status', { status: OrderStatus.DELIVERED })
          .andWhere('o.createdAt >= :start', { start: startOfMonth })
          .getRawOne<{ revenue: string }>(),

        // Revenue last month
        this.orderRepo
          .createQueryBuilder('o')
          .select('COALESCE(SUM(o.totalAmount), 0)', 'revenue')
          .where('o.status = :status', { status: OrderStatus.DELIVERED })
          .andWhere('o.createdAt >= :start AND o.createdAt <= :end', {
            start: startOfLastMonth,
            end: endOfLastMonth,
          })
          .getRawOne<{ revenue: string }>(),

        // Total orders
        this.orderRepo.count(),

        // Pending orders (PENDING + CONFIRMED)
        this.orderRepo
          .createQueryBuilder('o')
          .where('o.status IN (:...statuses)', {
            statuses: [OrderStatus.PENDING, OrderStatus.CONFIRMED],
          })
          .getCount(),

        // Total active products
        this.productRepo.count({ where: { isActive: true } }),

        // Low stock products (stock < lowStockThreshold)
        this.productRepo
          .createQueryBuilder('p')
          .where('p.isActive = true AND p.stock < p.lowStockThreshold')
          .getCount(),

        // Total customers (non-admin users)
        this.userRepo.count({ where: { role: 'user' as any } }),
      ]);

    return {
      totalRevenue: parseFloat(totalRevenue?.revenue ?? '0'),
      revenueThisMonth: parseFloat(revenueThisMonth?.revenue ?? '0'),
      revenueLastMonth: parseFloat(revenueLastMonth?.revenue ?? '0'),
      totalOrders,
      pendingOrders,
      totalProducts,
      lowStockProducts,
      totalCustomers,
    };
  }

  async getRevenueChart(days: number) {
    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .select("TO_CHAR(o.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COALESCE(SUM(o.totalAmount), 0)', 'revenue')
      .addSelect('COUNT(o.id)::int', 'orderCount')
      .where('o.status = :status', { status: OrderStatus.DELIVERED })
      .andWhere("o.createdAt >= NOW() - INTERVAL ':days days'", { days })
      .groupBy("TO_CHAR(o.createdAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; revenue: string; orderCount: number }>();

    return rows.map((r) => ({
      date: r.date,
      revenue: parseFloat(r.revenue),
      orderCount: r.orderCount,
    }));
  }

  async getTopProducts(limit: number) {
    const rows = await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o', 'o.status = :status', { status: OrderStatus.DELIVERED })
      .select('oi.productId', 'productId')
      .addSelect('SUM(oi.quantity)::int', 'totalSold')
      .addSelect('SUM(oi.quantity * oi.unitPrice)', 'totalRevenue')
      .groupBy('oi.productId')
      .orderBy('totalSold', 'DESC')
      .limit(limit)
      .getRawMany<{ productId: string; totalSold: number; totalRevenue: string }>();

    const products = await this.productRepo.findByIds(rows.map((r) => r.productId));
    const productMap = new Map(products.map((p) => [p.id, p]));

    return rows
      .filter((r) => productMap.has(r.productId))
      .map((r) => ({
        product: productMap.get(r.productId)!,
        totalSold: r.totalSold,
        totalRevenue: parseFloat(r.totalRevenue),
      }));
  }

  async getLowStockProducts(threshold?: number) {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .where('p.isActive = true');

    if (threshold !== undefined) {
      qb.andWhere('p.stock < :threshold', { threshold });
    } else {
      qb.andWhere('p.stock < p.lowStockThreshold');
    }

    return qb.orderBy('p.stock', 'ASC').getMany();
  }
}
