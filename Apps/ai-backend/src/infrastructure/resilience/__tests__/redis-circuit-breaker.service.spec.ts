import RedisMock from 'ioredis-mock';

jest.mock('ioredis', () => require('ioredis-mock'));
(RedisMock.prototype as any).connect = jest.fn().mockResolvedValue(undefined);

import { RedisService } from '../../cache/redis.service';
import { RedisCircuitBreakerService } from '../redis-circuit-breaker.service';

describe('RedisCircuitBreakerService', () => {
  let redis: RedisService;
  let breaker: RedisCircuitBreakerService;

  beforeEach(async () => {
    process.env['REDIS_HOST'] = 'localhost';
    redis = new RedisService();
    await redis.onModuleInit();
    breaker = new RedisCircuitBreakerService(redis);
  });

  afterEach(async () => {
    await redis.onModuleDestroy();
    delete process.env['REDIS_HOST'];
  });

  it('starts CLOSED and allows execution', async () => {
    expect(await breaker.canExecute('job-a')).toBe(true);
    expect(await breaker.getState('job-a')).toBe('CLOSED');
  });

  it('opens after reaching the failure threshold and blocks execution', async () => {
    await breaker.onFailure('job-b');
    await breaker.onFailure('job-b');
    expect(await breaker.canExecute('job-b')).toBe(true); // still under threshold (2/3)

    await breaker.onFailure('job-b');
    expect(await breaker.getState('job-b')).toBe('OPEN');
    expect(await breaker.canExecute('job-b')).toBe(false);
  });

  it('resets to CLOSED on success', async () => {
    await breaker.onFailure('job-c');
    await breaker.onFailure('job-c');
    await breaker.onSuccess('job-c');

    expect(await breaker.getState('job-c')).toBe('CLOSED');
    expect(await breaker.canExecute('job-c')).toBe(true);
  });

  it('shares state across instances of the service (distributed)', async () => {
    const secondInstance = new RedisCircuitBreakerService(redis);

    await breaker.onFailure('job-d');
    await breaker.onFailure('job-d');
    await breaker.onFailure('job-d');

    expect(await secondInstance.getState('job-d')).toBe('OPEN');
    expect(await secondInstance.canExecute('job-d')).toBe(false);
  });

  it('is a permissive no-op when Redis is not configured', async () => {
    delete process.env['REDIS_HOST'];
    const unconfiguredRedis = new RedisService();
    await unconfiguredRedis.onModuleInit();
    const unconfiguredBreaker = new RedisCircuitBreakerService(unconfiguredRedis);

    await unconfiguredBreaker.onFailure('job-e');
    expect(await unconfiguredBreaker.canExecute('job-e')).toBe(true);
  });
});
