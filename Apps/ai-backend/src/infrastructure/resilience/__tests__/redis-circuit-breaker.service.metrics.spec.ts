import RedisMock from 'ioredis-mock';

jest.mock('ioredis', () => require('ioredis-mock'));
(RedisMock.prototype as any).connect = jest.fn().mockResolvedValue(undefined);

import { RedisService } from '../../cache/redis.service';
import { MetricsService } from '../../observability/metrics.service';
import { RedisCircuitBreakerService } from '../redis-circuit-breaker.service';

describe('RedisCircuitBreakerService — observability wiring', () => {
  let redis: RedisService;
  let metrics: MetricsService;
  let breaker: RedisCircuitBreakerService;

  beforeEach(async () => {
    process.env['REDIS_HOST'] = 'localhost';
    redis = new RedisService();
    await redis.onModuleInit();
    metrics = new MetricsService();
    breaker = new RedisCircuitBreakerService(redis, metrics);
  });

  afterEach(async () => {
    await redis.onModuleDestroy();
    delete process.env['REDIS_HOST'];
  });

  it('sets circuit_breaker_state to OPEN(1) once the failure threshold is reached', async () => {
    await breaker.onFailure('job-x');
    await breaker.onFailure('job-x');
    await breaker.onFailure('job-x');

    const text = await metrics.getMetricsText();
    expect(text).toMatch(/circuit_breaker_state\{job="job-x"\} 1/);
  });

  it('sets circuit_breaker_state to CLOSED(0) on success', async () => {
    await breaker.onFailure('job-y');
    await breaker.onSuccess('job-y');

    const text = await metrics.getMetricsText();
    expect(text).toMatch(/circuit_breaker_state\{job="job-y"\} 0/);
  });
});
