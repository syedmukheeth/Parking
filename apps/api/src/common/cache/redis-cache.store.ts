import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import type { CacheStore } from './cache-store.interface';

@Injectable()
export class RedisCacheStore implements CacheStore, OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger('RedisCacheStore');

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
    this.client.on('error', (err: Error) => this.logger.error('Redis connection error', err.stack));
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const value = await this.client.incr(key);
    if (value === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return value;
  }

  async ping(): Promise<boolean> {
    try {
      const reply = await this.client.ping();
      return reply === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
