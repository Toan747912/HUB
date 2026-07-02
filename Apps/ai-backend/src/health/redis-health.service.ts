import { Injectable } from '@nestjs/common';
import { RedisService } from '../infrastructure/cache/redis.service';

export type RedisHealthStatus = 'connected' | 'disconnected' | 'not_configured';

@Injectable()
export class RedisHealthService {
  constructor(private readonly redis: RedisService) {}

  isReady(): boolean {
    if (!this.redis.isConfigured()) {
      return true;
    }
    return this.redis.isReady();
  }

  getStatus(): RedisHealthStatus {
    if (!this.redis.isConfigured()) {
      return 'not_configured';
    }
    return this.redis.isReady() ? 'connected' : 'disconnected';
  }
}
