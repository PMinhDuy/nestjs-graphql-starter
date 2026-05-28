import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetMyOrdersQuery } from '../impl/get-my-orders.query';
import { GetOrderQuery } from '../impl/get-order.query';
import { Order } from '../../entities/order.entity';

@QueryHandler(GetMyOrdersQuery)
export class GetMyOrdersHandler implements IQueryHandler<GetMyOrdersQuery> {
  constructor(@InjectRepository(Order) private orderRepo: Repository<Order>) {}

  execute(query: GetMyOrdersQuery): Promise<Order[]> {
    return this.orderRepo.find({
      where: { userId: query.userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }
}

@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery> {
  constructor(@InjectRepository(Order) private orderRepo: Repository<Order>) {}

  async execute(query: GetOrderQuery): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: query.orderId },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException(`Order ${query.orderId} not found`);
    // Ownership check — users can only view their own orders
    if (order.userId !== query.userId) throw new ForbiddenException('Access denied');
    return order;
  }
}
