import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CancelOrderCommand } from '../impl/cancel-order.command';
import { Order, OrderStatus } from '../../entities/order.entity';
import { Product } from '../../../catalog/products/product.entity';

const CANCELLABLE_STATUSES: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED];

@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand> {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async execute(command: CancelOrderCommand): Promise<Order> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const orderRepo = manager.getRepository(Order);

      const order = await orderRepo.findOne({
        where: { id: command.orderId },
        relations: ['items'],
      });

      if (!order) throw new NotFoundException(`Order ${command.orderId} not found`);
      if (order.userId !== command.userId) throw new ForbiddenException('Access denied');
      if (!CANCELLABLE_STATUSES.includes(order.status)) {
        throw new BadRequestException(
          `Cannot cancel order with status "${order.status}". Only PENDING or CONFIRMED orders can be cancelled.`,
        );
      }

      order.status = OrderStatus.CANCELLED;
      const cancelled = await orderRepo.save(order);

      // Restore stock for each item
      const productRepo = manager.getRepository(Product);
      for (const item of order.items) {
        await productRepo
          .createQueryBuilder()
          .update(Product)
          .set({ stock: () => `stock + ${item.quantity}` })
          .where('id = :id', { id: item.productId })
          .execute();
      }

      return cancelled;
    });
  }
}
