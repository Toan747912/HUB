import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../cache/redis.service';
import { MetricsService } from '../observability/metrics.service';
import { SpanFactory } from '../observability/span.factory';
import { TracerService } from '../observability/tracer.service';

export interface RoadmapLock {
  roadmapId: string;
  token: string;
}

export class RoadmapLockAcquisitionError extends Error {
  constructor(roadmapId: string) {
    super(`Could not acquire distributed lock for roadmap ${roadmapId}`);
    this.name = 'RoadmapLockAcquisitionError';
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
export class RoadmapLockService {
  private readonly logger = new Logger(RoadmapLockService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly tracer?: TracerService,
    private readonly metrics?: MetricsService
  ) {}

  private key(roadmapId: string): string {
    return `lock:roadmap:${roadmapId}`;
  }

  async lock(roadmapId: string): Promise<RoadmapLock> {
    const run = () => this.doLock(roadmapId);
    if (!this.tracer) return run();
    return this.tracer.withSpan('redis.lock', SpanFactory.attributesFor({ operation: 'lock', aggregateId: roadmapId }), run);
  }

  private async doLock(roadmapId: string): Promise<RoadmapLock> {
    const token = randomUUID();
    const start = Date.now();

    if (!this.redis.isConfigured()) {
      return { roadmapId, token };
    }

    const client = this.redis.getClient();

    try {
      for (let attempt = 0; attempt < ACQUIRE_MAX_ATTEMPTS; attempt++) {
        const result = await client.set(this.key(roadmapId), token, 'PX', LOCK_TTL_MS, 'NX');
        if (result === 'OK') {
          return { roadmapId, token };
        }
        await new Promise((resolve) => setTimeout(resolve, ACQUIRE_RETRY_DELAY_MS));
      }
      throw new RoadmapLockAcquisitionError(roadmapId);
    } finally {
      this.metrics?.recordRedisLatency('lock', Date.now() - start);
    }
  }

  async unlock(lock: RoadmapLock): Promise<void> {
    const run = () => this.doUnlock(lock);
    if (!this.tracer) return run();
    return this.tracer.withSpan('redis.unlock', SpanFactory.attributesFor({ operation: 'unlock', aggregateId: lock.roadmapId }), run);
  }

  private async doUnlock(lock: RoadmapLock): Promise<void> {
    if (!this.redis.isConfigured()) {
      return;
    }

    const client = this.redis.getClient();
    const start = Date.now();
    try {
      await client.eval(UNLOCK_SCRIPT, 1, this.key(lock.roadmapId), lock.token);
      this.metrics?.recordRedisLatency('unlock', Date.now() - start);
    } catch (error) {
      this.metrics?.recordRedisLatency('unlock', Date.now() - start);
      this.logger.warn(
        JSON.stringify({
          event: 'roadmap_lock_release_failed',
          roadmapId: lock.roadmapId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        })
      );
    }
  }
}
