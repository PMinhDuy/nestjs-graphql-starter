import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Order, OrderStatus } from './entities/order.entity';
import { PlaceOrderCommand } from './commands/impl/place-order.command';
import { UpdateOrderStatusCommand } from './commands/impl/update-order-status.command';
import { GetMyOrdersQuery } from './queries/impl/get-my-orders.query';
import { GetOrderQuery } from './queries/impl/get-order.query';
import { CurrentUser, Roles } from '../../common/decorators';
import { User, UserRole } from '../users/user.entity';

@Resolver(() => Order)
export class OrdersResolver {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Mutation(() => Order)
  placeOrder(
    @CurrentUser() user: User,
    @Args('shippingAddressId', { type: () => ID }) shippingAddressId: string,
  ): Promise<Order> {
    return this.commandBus.execute(new PlaceOrderCommand(user.id, shippingAddressId));
  }

  @Query(() => [Order])
  myOrders(@CurrentUser() user: User): Promise<Order[]> {
    return this.queryBus.execute(new GetMyOrdersQuery(user.id));
  }

  // Used by clients to poll order status (GraphQL subscriptions not supported on Lambda)
  @Query(() => Order)
  myOrder(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Order> {
    return this.queryBus.execute(new GetOrderQuery(id, user.id));
  }

  @Mutation(() => Order)
  @Roles(UserRole.ADMIN)
  updateOrderStatus(
    @Args('id', { type: () => ID }) id: string,
    @Args('status', { type: () => OrderStatus }) status: OrderStatus,
  ): Promise<Order> {
    return this.commandBus.execute(new UpdateOrderStatusCommand(id, status));
  }
}
