import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

export interface OrderEvent {
  eventType: 'OrderPlaced' | 'OrderStatusUpdated' | 'OrderCancelled';
  orderId: string;
  userId: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly client: SNSClient;
  private readonly topicArn: string;

  constructor(private config: ConfigService) {
    this.client = new SNSClient({ region: this.config.get<string>('aws.region') });
    this.topicArn = this.config.get<string>('aws.orderTopicArn') ?? '';
  }

  async publishOrderEvent(event: OrderEvent): Promise<void> {
    if (!this.topicArn) return; // Skip if not configured (local dev without SNS)

    await this.client.send(
      new PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify(event),
        Subject: event.eventType, // Delivered to email/HTTP endpoints only — not consumed by SQS subscribers
        MessageAttributes: {
          eventType: { DataType: 'String', StringValue: event.eventType },
          userId: { DataType: 'String', StringValue: event.userId },
        },
      }),
    );
  }
}
