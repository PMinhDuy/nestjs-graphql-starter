import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { User, UserRole } from './user.entity';
import { Address } from './address.entity';
import { UsersService } from './users.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { CreateAddressInput } from './dto/create-address.input';
import { UpdateAddressInput } from './dto/update-address.input';

@Resolver(() => User)
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  @Roles(UserRole.ADMIN)
  @Query(() => [User])
  async users(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Query(() => User)
  async me(@CurrentUser() user: User): Promise<User> {
    return user;
  }

  // Lazy-load addresses when the client requests the addresses field on User
  @ResolveField(() => [Address])
  async addresses(@Parent() user: User): Promise<Address[]> {
    return this.usersService.findAddressesByUserId(user.id);
  }

  @Query(() => [Address])
  async myAddresses(@CurrentUser() user: User): Promise<Address[]> {
    return this.usersService.findAddressesByUserId(user.id);
  }

  @Mutation(() => Address)
  async addAddress(
    @CurrentUser() user: User,
    @Args('input') input: CreateAddressInput,
  ): Promise<Address> {
    return this.usersService.addAddress(user.id, input);
  }

  @Mutation(() => Address)
  async updateAddress(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateAddressInput,
  ): Promise<Address> {
    return this.usersService.updateAddress(user.id, id, input);
  }

  @Mutation(() => Boolean)
  async removeAddress(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.usersService.removeAddress(user.id, id);
  }

  @Mutation(() => Address)
  async setDefaultAddress(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Address> {
    return this.usersService.setDefaultAddress(user.id, id);
  }
}
