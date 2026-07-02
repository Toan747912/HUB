import RedisMock from 'ioredis-mock';

jest.mock('ioredis', () => require('ioredis-mock'));
(RedisMock.prototype as any).connect = jest.fn().mockResolvedValue(undefined);

import { RedisService } from '../../cache/redis.service';
import { MetricsService } from '../../observability/metrics.service';
import { TracerService } from '../../observability/tracer.service';
import { GoalLockService } from '../goal-lock.service';

describe('GoalLockService — observability wiring', () => {
  let redis: RedisService;
  let tracer: { withSpan: jest.Mock };
  let metrics: MetricsService;
  let locks: GoalLockService;

  beforeEach(async () => {
    process.env['REDIS_HOST'] = 'localhost';
    redis = new RedisService();
    await redis.onModuleInit();
    tracer = { withSpan: jest.fn(async (_name, _attrs, fn) => fn()) };
    metrics = new MetricsService();
    locks = new GoalLockService(redis, tracer as unknown as TracerService, metrics);
  });

  afterEach(async () => {
    await redis.onModuleDestroy();
    delete process.env['REDIS_HOST'];
  });

  it('wraps lock() in a span with operation=lock and the goalId as aggregateId', async () => {
    const lock = await locks.lock('goal-trace-1');

    expect(tracer.withSpan).toHaveBeenCalledWith(
      'redis.lock',
      expect.objectContaining({ operation: 'lock', aggregateId: 'goal-trace-1' }),
      expect.any(Function)
    );

    await locks.unlock(lock);
  });

  it('records redis_latency_ms for lock and unlock operations', async () => {
    const lock = await locks.lock('goal-trace-2');
    await locks.unlock(lock);

    const text = await metrics.getMetricsText();
    expect(text).toMatch(/redis_latency_ms_count\{operation="lock"\} 1/);
    expect(text).toMatch(/redis_latency_ms_count\{operation="unlock"\} 1/);
  });
});
