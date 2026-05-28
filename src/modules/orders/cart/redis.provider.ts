import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

// Module-level singleton — Lambda reuses the connection across warm invocations
export const RedisProvider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const client = new Redis({
      host: config.get<string>('redis.host'),
      port: config.get<number>('redis.port'),
      tls: config.get<boolean>('redis.tls') ? {} : undefined,
    });
    client.on('error', (err) => console.error('[Redis] connection error', err.message));
    return client;
  },
};
