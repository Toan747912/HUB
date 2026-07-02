import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../cache/redis.service';
import { MetricsService } from '../observability/metrics.service';
import { SpanFactory } from '../observability/span.factory';
import { TracerService } from '../observability/tracer.service';

export interface RecommendationLock {
  recommendationId: string;
  token: string;
}

export class RecommendationLockAcquisitionError extends Error {
  constructor(recommendationId: string) {
    super(`Could not acquire distributed lock for recommendation ${recommendationId}`);
    this.name = 'RecommendationLockAcquisitionError';
  }
}

const LOCK_TTL_MS = 10_000;
const ACQUIRE_RETRY_DELAY_MS = 50;
const ACQUIRE_MAX_ATTEMPTS = 20;

const UNLOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

@Injectable()
export class RecommendationLockService {
  private readonly logger = new Logger(RecommendationLockService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly tracer?: TracerService,
    private readonly metrics?: MetricsService
  ) {}

  private key(recommendationId: string): string {
    return `lock:recommendation:${recommendationId}`;
  }

  async lock(recommendationId: string): Promise<RecommendationLock> {
    const run = () => this.doLock(recommendationId);
    if (!this.tracer) return run();
    return this.tracer.withSpan('redis.lock', SpanFactory.attributesFor({ operation: 'lock', aggregateId: recommendationId }), run);
  }

  private async doLock(recommendationId: string): Promise<RecommendationLock> {
    const token = randomUUID();
    const start = Date.now();

    if (!this.redis.isConfigured()) {
      return { recommendationId, token };
    }

    const client = this.redis.getClient();

    try {
      for (let attempt = 0; attempt < ACQUIRE_MAX_ATTEMPTS; attempt++) {
        const result = await client.set(this.key(recommendationId), token, 'PX', LOCK_TTL_MS, 'NX');
        if (result === 'OK') {
          return { recommendationId, token };
        }
        await new Promise((resolve) => setTimeout(resolve, ACQUIRE_RETRY_DELAY_MS));
      }
      throw new RecommendationLockAcquisitionError(recommendationId);
    } finally {
      this.metrics?.recordRedisLatency('lock', Date.now() - start);
    }
  }

  async unlock(lock: RecommendationLock): Promise<void> {
    const run = () => this.doUnlock(lock);
    if (!this.tracer) return run();
    return this.tracer.withSpan('redis.unlock', SpanFactory.attributesFor({ operation: 'unlock', aggregateId: lock.recommendationId }), run);
  }

  private async doUnlock(lock: RecommendationLock): Promise<void> {
    if (!this.redis.isConfigured()) {
      return;
    }

    const client = this.redis.getClient();
    const start = Date.now();
    try {
      await client.eval(UNLOCK_SCRIPT, 1, this.key(lock.recommendationId), lock.token);
      this.metrics?.recordRedisLatency('unlock', Date.now() - start);
    } catch (error) {
      this.metrics?.recordRedisLatency('unlock', Date.now() - start);
      this.logger.warn(
        JSON.stringify({
          event: 'recommendation_lock_release_failed',
          recommendationId: lock.recommendationId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        })
      );
    }
  }
}
