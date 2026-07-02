import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../cache/redis.service';
import { MetricsService } from '../observability/metrics.service';
import { SpanFactory } from '../observability/span.factory';
import { TracerService } from '../observability/tracer.service';

export interface GoalLock {
  goalId: string;
  token: string;
}

export class GoalLockAcquisitionError extends Error {
  constructor(goalId: string) {
    super(`Could not acquire distributed lock for goal ${goalId}`);
    this.name = 'GoalLockAcquisitionError';
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
export class GoalLockService {
  private readonly logger = new Logger(GoalLockService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly tracer?: TracerService,
    private readonly metrics?: MetricsService
  ) {}

  private key(goalId: string): string {
    return `lock:goal:${goalId}`;
  }

  async lock(goalId: string): Promise<GoalLock> {
    const run = () => this.doLock(goalId);
    if (!this.tracer) return run();
    return this.tracer.withSpan('redis.lock', SpanFactory.attributesFor({ operation: 'lock', aggregateId: goalId }), run);
  }

  private async doLock(goalId: string): Promise<GoalLock> {
    const token = randomUUID();
    const start = Date.now();

    if (!this.redis.isConfigured()) {
      // No Redis configured (single-instance/dev mode) — locking is a no-op.
      return { goalId, token };
    }

    const client = this.redis.getClient();

    try {
      for (let attempt = 0; attempt < ACQUIRE_MAX_ATTEMPTS; attempt++) {
        const result = await client.set(this.key(goalId), token, 'PX', LOCK_TTL_MS, 'NX');
        if (result === 'OK') {
          return { goalId, token };
        }
        await new Promise((resolve) => setTimeout(resolve, ACQUIRE_RETRY_DELAY_MS));
      }
      throw new GoalLockAcquisitionError(goalId);
    } finally {
      this.metrics?.recordRedisLatency('lock', Date.now() - start);
    }
  }

  async unlock(lock: GoalLock): Promise<void> {
    const run = () => this.doUnlock(lock);
    if (!this.tracer) return run();
    return this.tracer.withSpan('redis.unlock', SpanFactory.attributesFor({ operation: 'unlock', aggregateId: lock.goalId }), run);
  }

  private async doUnlock(lock: GoalLock): Promise<void> {
    if (!this.redis.isConfigured()) {
      return;
    }

    const client = this.redis.getClient();
    const start = Date.now();
    try {
      await client.eval(UNLOCK_SCRIPT, 1, this.key(lock.goalId), lock.token);
      this.metrics?.recordRedisLatency('unlock', Date.now() - start);
    } catch (error) {
      this.metrics?.recordRedisLatency('unlock', Date.now() - start);
      this.logger.warn(
        JSON.stringify({
          event: 'goal_lock_release_failed',
          goalId: lock.goalId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        })
      );
    }
  }
}
