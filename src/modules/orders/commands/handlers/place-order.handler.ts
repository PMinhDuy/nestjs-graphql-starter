import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, DataSource, EntityManager } from 'typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PlaceOrderCommand } from '../impl/place-order.command';
import { OrderPlacedEvent } from '../../events/impl/order-placed.event';
import { Order } from '../../entities/order.entity';
import { CartService } from '../../cart/cart.service';
import { Product } from '../../../catalog/products/product.entity';
import { Address } from '../../../users/address.entity';

@CommandHandler(PlaceOrderCommand)
export class PlaceOrderHandler implements ICommandHandler<PlaceOrderCommand> {
  constructor(
    @InjectRepository(Address) private addressRepo: Repository<Address>,
    @InjectDataSource() private dataSource: DataSource,
    private cartService: CartService,
    private eventBus: EventBus,
  ) {}

  async execute(command: PlaceOrderCommand): Promise<Order> {
    const cartItems = await this.cartService.getCartItems(command.userId);
    if (!cartItems.length) throw new BadRequestException('Cart is empty');

    // Validate shipping address belongs to the requesting user
    const address = await this.addressRepo.findOneBy({ id: command.shippingAddressId });
    if (!address) throw new BadRequestException('Shipping address not found');
    if (address.userId !== command.userId) throw new ForbiddenException('Address does not belong to user');

    const productIds = cartItems.map((i) => i.productId);

    // All DB writes in a single transaction — prevents partial-write on crash
    const order = await this.dataSource.transaction(async (manager: EntityManager) => {
      const productRepo = manager.getRepository(Product);
      const orderRepo = manager.getRepository(Order);

      const products = await productRepo.findBy({ id: In(productIds) });
      const productMap = new Map(products.map((p) => [p.id, p]));

      // Validate all products exist and have sufficient stock
      for (const item of cartItems) {
        const product = productMap.get(item.productId);
        if (!product) throw new BadRequestException(`Product ${item.productId} not found`);
        if (product.stock < item.quantity) {
          throw new BadRequestException(`Insufficient stock for product ${item.productId}`);
        }
      }

      // Build order items with price snapshot
      const orderItems = cartItems.map((item) => {
        const product = productMap.get(item.productId)!;
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: parseFloat(String(product.price)),
        };
      });
      const totalAmount = orderItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

      const newOrder = await orderRepo.save(
        orderRepo.create({
          userId: command.userId,
          shippingAddressId: command.shippingAddressId,
          totalAmount,
          items: orderItems,
        }),
      );

      // Atomic stock decrement — WHERE stock >= quantity prevents oversell
      for (const item of cartItems) {
        const result = await productRepo
          .createQueryBuilder()
          .update(Product)
          .set({ stock: () => `stock - ${item.quantity}` })
          .where('id = :id AND stock >= :quantity', { id: item.productId, quantity: item.quantity })
          .execute();

        if (!result.affected || result.affected === 0) {
          throw new BadRequestException(`Product ${item.productId} is out of stock`);
        }
      }

      return newOrder;
    });

    // Cart clear is best-effort — stays outside the transaction
    await this.cartService.clearCart(command.userId);
    this.eventBus.publish(new OrderPlacedEvent(order.id, command.userId, order.totalAmount));

    return order;
  }
}
