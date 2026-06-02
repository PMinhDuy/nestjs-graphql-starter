import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './review.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsResolver, ProductReviewFieldsResolver } from './reviews.resolver';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Order, OrderItem])],
  providers: [ReviewsService, ReviewsResolver, ProductReviewFieldsResolver],
  exports: [ReviewsService],
})
export class ReviewsModule {}
