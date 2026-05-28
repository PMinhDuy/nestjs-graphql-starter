import { OrderStatus } from '../../entities/order.entity';

export class UpdateOrderStatusCommand {
  constructor(
    public readonly orderId: string,
    public readonly status: OrderStatus,
  ) {}
}
