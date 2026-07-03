import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { MetricsService } from '../observability/metrics.service';
import { getRedisOptions, isRedisConfigured } from './redis.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private ready = false;

  constructor(private readonly metrics?: MetricsService) {}

  async onModuleInit(): Promise<void> {
    if (!isRedisConfigured()) {
      this.logger.log(
        JSON.stringify({ event: 'redis_not_configured', timestamp: new Date().toISOString() }),
      );
      return;
    }

    const options = getRedisOptions()!;
    const client = new Redis(options);

    client.on('connect', () => {
      this.ready = true;
      this.logger.log(
        JSON.stringify({ event: 'redis_connected', timestamp: new Date().toISOString() }),
      );
    });
    client.on('error', (err: Error) => {
      this.ready = false;
      this.logger.error(
        JSON.stringify({
          event: 'redis_error',
          error: err.message,
          timestamp: new Date().toISOString(),
        }),
      );
    });
    client.on('close', () => {
      this.ready = false;
      this.logger.warn(
        JSON.stringify({ event: 'redis_disconnected', timestamp: new Date().toISOString() }),
      );
    });

    this.client = client;

    // Fail-fast: if Redis is configured but unreachable at startup, do not let the
    // app boot into a half-working state.
    try {
      await client.connect();
      await client.ping();
      this.ready = true;
    } catch (error) {
      throw new Error(
        `Redis is configured (REDIS_HOST set) but unreachable at startup: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }

  isConfigured(): boolean {
    return isRedisConfigured();
  }

  isReady(): boolean {
    return this.ready;
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client requested but Redis is not configured (REDIS_HOST unset).');
    }
    return this.client;
  }

  async ping(): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    const start = Date.now();
    try {
      await this.client.ping();
      this.metrics?.recordRedisLatency('ping', Date.now() - start);
      return true;
    } catch {
      this.metrics?.recordRedisLatency('ping', Date.now() - start);
      return false;
    }
  }
}
