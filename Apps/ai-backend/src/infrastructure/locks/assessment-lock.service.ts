import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../cache/redis.service';
import { MetricsService } from '../observability/metrics.service';
import { SpanFactory } from '../observability/span.factory';
import { TracerService } from '../observability/tracer.service';

export interface AssessmentLock {
  assessmentId: string;
  token: string;
}

export class AssessmentLockAcquisitionError extends Error {
  constructor(assessmentId: string) {
    super(`Could not acquire distributed lock for assessment ${assessmentId}`);
    this.name = 'AssessmentLockAcquisitionError';
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
export class AssessmentLockService {
  private readonly logger = new Logger(AssessmentLockService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly tracer?: TracerService,
    private readonly metrics?: MetricsService,
  ) {}

  private key(assessmentId: string): string {
    return `lock:assessment:${assessmentId}`;
  }

  async lock(assessmentId: string): Promise<AssessmentLock> {
    const run = () => this.doLock(assessmentId);
    if (!this.tracer) return run();
    return this.tracer.withSpan(
      'redis.lock',
      SpanFactory.attributesFor({ operation: 'lock', aggregateId: assessmentId }),
      run,
    );
  }

  private async doLock(assessmentId: string): Promise<AssessmentLock> {
    const token = randomUUID();
    const start = Date.now();

    if (!this.redis.isConfigured()) {
      return { assessmentId, token };
    }

    const client = this.redis.getClient();

    try {
      for (let attempt = 0; attempt < ACQUIRE_MAX_ATTEMPTS; attempt++) {
        const result = await client.set(this.key(assessmentId), token, 'PX', LOCK_TTL_MS, 'NX');
        if (result === 'OK') {
          return { assessmentId, token };
        }
        await new Promise((resolve) => setTimeout(resolve, ACQUIRE_RETRY_DELAY_MS));
      }
      throw new AssessmentLockAcquisitionError(assessmentId);
    } finally {
      this.metrics?.recordRedisLatency('lock', Date.now() - start);
    }
  }

  async unlock(lock: AssessmentLock): Promise<void> {
    const run = () => this.doUnlock(lock);
    if (!this.tracer) return run();
    return this.tracer.withSpan(
      'redis.unlock',
      SpanFactory.attributesFor({ operation: 'unlock', aggregateId: lock.assessmentId }),
      run,
    );
  }

  private async doUnlock(lock: AssessmentLock): Promise<void> {
    if (!this.redis.isConfigured()) {
      return;
    }

    const client = this.redis.getClient();
    const start = Date.now();
    try {
      await client.eval(UNLOCK_SCRIPT, 1, this.key(lock.assessmentId), lock.token);
      this.metrics?.recordRedisLatency('unlock', Date.now() - start);
    } catch (error) {
      this.metrics?.recordRedisLatency('unlock', Date.now() - start);
      this.logger.warn(
        JSON.stringify({
          event: 'assessment_lock_release_failed',
          assessmentId: lock.assessmentId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        }),
      );
    }
  }
}
