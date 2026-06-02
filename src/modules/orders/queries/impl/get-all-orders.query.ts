import { OrderStatus } from '../../entities/order.entity';

export class GetAllOrdersQuery {
  constructor(
    public readonly status?: OrderStatus,
    public readonly userId?: string,
    public readonly limit = 50,
    public readonly offset = 0,
  ) {}
}
