import { Injectable } from '@nestjs/common';
import { RedisService } from '../../cache/redis.service';

const MAX_FAILURES = 5;
const WINDOW_SECONDS = 15 * 60;

@Injectable()
export class BruteForceService {
  constructor(private readonly redis?: RedisService) {}

  private key(username: string): string {
    return `bruteforce:login:${username}`;
  }

  async isLocked(username: string): Promise<boolean> {
    if (!this.redis?.isConfigured()) {
      return false;
    }
    const count = await this.redis.getClient().get(this.key(username));
    return count !== null && parseInt(count, 10) >= MAX_FAILURES;
  }

  async recordFailure(username: string): Promise<void> {
    if (!this.redis?.isConfigured()) {
      return;
    }
    const client = this.redis.getClient();
    const count = await client.incr(this.key(username));
    if (count === 1) {
      await client.expire(this.key(username), WINDOW_SECONDS);
    }
  }

  async reset(username: string): Promise<void> {
    if (!this.redis?.isConfigured()) {
      return;
    }
    await this.redis.getClient().del(this.key(username));
  }
}
