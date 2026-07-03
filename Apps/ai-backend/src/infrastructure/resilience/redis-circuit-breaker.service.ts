import { Injectable } from '@nestjs/common';
import { RedisService } from '../cache/redis.service';
import { MetricsService } from '../observability/metrics.service';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 30_000;

@Injectable()
export class RedisCircuitBreakerService {
  constructor(
    private readonly redis: RedisService,
    private readonly metrics?: MetricsService,
  ) {}

  private key(jobId: string): string {
    return `circuit:${jobId}`;
  }

  async canExecute(jobId: string): Promise<boolean> {
    if (!this.redis.isConfigured()) {
      return true;
    }

    const client = this.redis.getClient();
    const record = await client.hgetall(this.key(jobId));

    if (!record || Object.keys(record).length === 0) {
      return true;
    }

    if (record['state'] === 'OPEN') {
      const openedAt = Number(record['openedAt'] ?? 0);
      if (openedAt && Date.now() - openedAt >= COOLDOWN_MS) {
        await client.hset(this.key(jobId), { state: 'HALF_OPEN' });
        this.metrics?.setCircuitBreakerState(jobId, 'HALF_OPEN');
        return true;
      }
      return false;
    }

    return true;
  }

  async onSuccess(jobId: string): Promise<void> {
    if (!this.redis.isConfigured()) {
      return;
    }
    await this.redis.getClient().del(this.key(jobId));
    this.metrics?.setCircuitBreakerState(jobId, 'CLOSED');
  }

  async onFailure(jobId: string): Promise<void> {
    if (!this.redis.isConfigured()) {
      return;
    }
    const client = this.redis.getClient();
    const failures = await client.hincrby(this.key(jobId), 'failures', 1);

    if (failures >= FAILURE_THRESHOLD) {
      await client.hset(this.key(jobId), {
        state: 'OPEN',
        openedAt: Date.now().toString(),
      });
      this.metrics?.setCircuitBreakerState(jobId, 'OPEN');
      return;
    }

    await client.hset(this.key(jobId), { state: 'CLOSED' });
    this.metrics?.setCircuitBreakerState(jobId, 'CLOSED');
  }

  async getState(jobId: string): Promise<CircuitState> {
    if (!this.redis.isConfigured()) {
      return 'CLOSED';
    }
    const record = await this.redis.getClient().hgetall(this.key(jobId));
    return (record['state'] as CircuitState) ?? 'CLOSED';
  }
}
