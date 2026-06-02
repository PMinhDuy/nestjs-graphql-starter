import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { WishlistService } from './wishlist.service';
import { Product } from '../catalog/products/product.entity';
import { CurrentUser } from '../../common/decorators';
import { User } from '../users/user.entity';

@Resolver()
export class WishlistResolver {
  constructor(private wishlistService: WishlistService) {}

  @Query(() => [Product])
  myWishlist(@CurrentUser() user: User): Promise<Product[]> {
    return this.wishlistService.getWishlist(user.id);
  }

  @Mutation(() => Boolean)
  addToWishlist(
    @CurrentUser() user: User,
    @Args('productId', { type: () => ID }) productId: string,
  ): Promise<boolean> {
    return this.wishlistService.addToWishlist(user.id, productId);
  }

  @Mutation(() => Boolean)
  removeFromWishlist(
    @CurrentUser() user: User,
    @Args('productId', { type: () => ID }) productId: string,
  ): Promise<boolean> {
    return this.wishlistService.removeFromWishlist(user.id, productId);
  }
}
