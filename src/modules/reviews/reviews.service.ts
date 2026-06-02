import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemRepo: Repository<OrderItem>,
  ) {}

  async getProductReviews(productId: string, limit = 20, offset = 0): Promise<Review[]> {
    return this.reviewRepo.find({
      where: { productId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getAverageRating(productId: string): Promise<number> {
    const result = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .where('r.productId = :productId', { productId })
      .getRawOne<{ avg: string | null }>();
    return result?.avg ? parseFloat(result.avg) : 0;
  }

  async getReviewCount(productId: string): Promise<number> {
    return this.reviewRepo.countBy({ productId });
  }

  async getUserReview(userId: string, productId: string): Promise<Review | null> {
    return this.reviewRepo.findOneBy({ userId, productId });
  }

  async createReview(
    userId: string,
    productId: string,
    orderId: string,
    rating: number,
    comment?: string | null,
  ): Promise<Review> {
    if (rating < 1 || rating > 5) throw new BadRequestException('Rating must be between 1 and 5');

    const order = await this.orderRepo.findOne({ where: { id: orderId }, relations: ['items'] });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');
    if (order.status !== OrderStatus.DELIVERED)
      throw new BadRequestException('You can only review products from delivered orders');

    const hasItem = order.items.some((i) => i.productId === productId);
    if (!hasItem) throw new BadRequestException('Product was not part of this order');

    const existing = await this.reviewRepo.findOneBy({ userId, productId });
    if (existing) throw new BadRequestException('You have already reviewed this product');

    const review = this.reviewRepo.create({ userId, productId, orderId, rating, comment: comment ?? null });
    return this.reviewRepo.save(review);
  }

  async updateReview(userId: string, id: string, rating: number, comment?: string | null): Promise<Review> {
    if (rating < 1 || rating > 5) throw new BadRequestException('Rating must be between 1 and 5');
    const review = await this.reviewRepo.findOneBy({ id });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException('Access denied');
    review.rating = rating;
    review.comment = comment ?? null;
    return this.reviewRepo.save(review);
  }

  async deleteReview(userId: string, id: string): Promise<boolean> {
    const review = await this.reviewRepo.findOneBy({ id });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException('Access denied');
    await this.reviewRepo.remove(review);
    return true;
  }
}
