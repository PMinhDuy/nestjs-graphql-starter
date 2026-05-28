import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { OrderPlacedEvent } from '../impl/order-placed.event';
import { NotificationsService } from '../../../notifications/notifications.service';

@EventsHandler(OrderPlacedEvent)
export class OrderPlacedHandler implements IEventHandler<OrderPlacedEvent> {
  private readonly logger = new Logger(OrderPlacedHandler.name);

  constructor(private notificationsService: NotificationsService) {}

  async handle(event: OrderPlacedEvent): Promise<void> {
    try {
      await this.notificationsService.publishOrderEvent({
        eventType: 'OrderPlaced',
        orderId: event.orderId,
        userId: event.userId,
        payload: { totalAmount: event.totalAmount },
      });
    } catch (err) {
      this.logger.error(`SNS publish failed for OrderPlaced orderId=${event.orderId}`, err);
    }
  }
}
