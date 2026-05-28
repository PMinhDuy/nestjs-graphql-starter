import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger, NotFoundException } from '@nestjs/common';
import { UpdateOrderStatusCommand } from '../impl/update-order-status.command';
import { Order } from '../../entities/order.entity';
import { NotificationsService } from '../../../notifications/notifications.service';

@CommandHandler(UpdateOrderStatusCommand)
export class UpdateOrderStatusHandler implements ICommandHandler<UpdateOrderStatusCommand> {
  private readonly logger = new Logger(UpdateOrderStatusHandler.name);

  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    private notificationsService: NotificationsService,
  ) {}

  async execute(command: UpdateOrderStatusCommand): Promise<Order> {
    const order = await this.orderRepo.findOneBy({ id: command.orderId });
    if (!order) throw new NotFoundException(`Order ${command.orderId} not found`);

    const previousStatus = order.status;
    order.status = command.status;
    const updated = await this.orderRepo.save(order);

    // SNS publish is best-effort — DB write already committed; don't surface publish failures as 500s
    try {
      await this.notificationsService.publishOrderEvent({
        eventType: 'OrderStatusUpdated',
        orderId: updated.id,
        userId: updated.userId,
        payload: { newStatus: updated.status, previousStatus },
      });
    } catch (err) {
      this.logger.error(`SNS publish failed for OrderStatusUpdated orderId=${updated.id}`, err);
    }

    return updated;
  }
}
