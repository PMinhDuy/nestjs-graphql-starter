import { registerAs } from '@nestjs/config';

export default registerAs('aws', () => ({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
  s3BucketName: process.env.S3_BUCKET_NAME ?? '',
  orderQueueUrl: process.env.ORDER_QUEUE_URL ?? '',
  orderTopicArn: process.env.ORDER_EVENTS_TOPIC_ARN ?? '',
}));
