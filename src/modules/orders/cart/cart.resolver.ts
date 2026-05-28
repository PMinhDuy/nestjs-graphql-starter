import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { CartService } from './cart.service';
import { CartType } from './dto/cart.type';
import { AddToCartInput } from './dto/add-to-cart.input';
import { CurrentUser } from '../../../common/decorators';
import { User } from '../../users/user.entity';

@Resolver()
export class CartResolver {
  constructor(private cartService: CartService) {}

  @Query(() => CartType)
  myCart(@CurrentUser() user: User): Promise<CartType> {
    return this.cartService.getCart(user.id);
  }

  @Mutation(() => Boolean)
  async addToCart(
    @CurrentUser() user: User,
    @Args('input') input: AddToCartInput,
  ): Promise<boolean> {
    await this.cartService.addItem(user.id, input.productId, input.quantity);
    return true;
  }

  @Mutation(() => Boolean)
  async removeFromCart(
    @CurrentUser() user: User,
    @Args('productId', { type: () => ID }) productId: string,
  ): Promise<boolean> {
    await this.cartService.removeItem(user.id, productId);
    return true;
  }
}
