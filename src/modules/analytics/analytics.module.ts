import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../catalog/products/product.entity';
import { User } from '../users/user.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsResolver } from './analytics.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product, User])],
  providers: [AnalyticsService, AnalyticsResolver],
})
export class AnalyticsModule {}
