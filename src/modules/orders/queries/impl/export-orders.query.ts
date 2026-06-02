import { OrderStatus } from '../../entities/order.entity';

export class ExportOrdersQuery {
  constructor(
    public readonly startDate?: string,
    public readonly endDate?: string,
    public readonly status?: OrderStatus,
  ) {}
}
