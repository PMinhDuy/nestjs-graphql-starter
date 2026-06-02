import { Resolver, Query, Mutation, Args, ResolveField, Parent, ID, Int, Float } from '@nestjs/graphql';
import { ReviewsService } from './reviews.service';
import { Review } from './review.entity';
import { Product } from '../catalog/products/product.entity';
import { CurrentUser, Public } from '../../common/decorators';
import { User } from '../users/user.entity';

@Resolver(() => Review)
export class ReviewsResolver {
  constructor(private reviewsService: ReviewsService) {}

  @Public()
  @Query(() => [Review])
  productReviews(
    @Args('productId', { type: () => ID }) productId: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit = 20,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 }) offset = 0,
  ): Promise<Review[]> {
    return this.reviewsService.getProductReviews(productId, limit, offset);
  }

  @Mutation(() => Review)
  createReview(
    @CurrentUser() user: User,
    @Args('productId', { type: () => ID }) productId: string,
    @Args('orderId', { type: () => ID }) orderId: string,
    @Args('rating', { type: () => Int }) rating: number,
    @Args('comment', { type: () => String, nullable: true }) comment?: string | null,
  ): Promise<Review> {
    return this.reviewsService.createReview(user.id, productId, orderId, rating, comment);
  }

  @Mutation(() => Review)
  updateReview(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
    @Args('rating', { type: () => Int }) rating: number,
    @Args('comment', { type: () => String, nullable: true }) comment?: string | null,
  ): Promise<Review> {
    return this.reviewsService.updateReview(user.id, id, rating, comment);
  }

  @Mutation(() => Boolean)
  deleteReview(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.reviewsService.deleteReview(user.id, id);
  }
}

// Extend Product type with review-related fields
@Resolver(() => Product)
export class ProductReviewFieldsResolver {
  constructor(private reviewsService: ReviewsService) {}

  @Public()
  @ResolveField(() => Float)
  averageRating(@Parent() product: Product): Promise<number> {
    return this.reviewsService.getAverageRating(product.id);
  }

  @Public()
  @ResolveField(() => Int)
  reviewCount(@Parent() product: Product): Promise<number> {
    return this.reviewsService.getReviewCount(product.id);
  }
}
