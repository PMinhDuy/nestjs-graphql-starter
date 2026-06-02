import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../catalog/products/product.entity';
import { Address } from '../users/address.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { RedisProvider } from './cart/redis.provider';
import { CartService } from './cart/cart.service';
import { CartResolver } from './cart/cart.resolver';
import { OrdersResolver } from './orders.resolver';
import { PlaceOrderHandler } from './commands/handlers/place-order.handler';
import { UpdateOrderStatusHandler } from './commands/handlers/update-order-status.handler';
import { CancelOrderHandler } from './commands/handlers/cancel-order.handler';
import { GetMyOrdersHandler, GetOrderHandler, GetAllOrdersHandler, ExportOrdersHandler } from './queries/handlers/get-orders.handler';
import { OrderPlacedHandler } from './events/handlers/order-placed.handler';

const CommandHandlers = [PlaceOrderHandler, UpdateOrderStatusHandler, CancelOrderHandler];
const QueryHandlers = [GetMyOrdersHandler, GetOrderHandler, GetAllOrdersHandler, ExportOrdersHandler];
const EventHandlers = [OrderPlacedHandler];

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, Address]),
    CqrsModule,
    NotificationsModule,
  ],
  providers: [
    RedisProvider,
    CartService,
    CartResolver,
    OrdersResolver,
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
  ],
})
export class OrdersModule {}
