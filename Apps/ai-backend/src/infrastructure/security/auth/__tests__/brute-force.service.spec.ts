import RedisMock from 'ioredis-mock';

jest.mock('ioredis', () => require('ioredis-mock'));
(RedisMock.prototype as any).connect = jest.fn().mockResolvedValue(undefined);

import { RedisService } from '../../../cache/redis.service';
import { BruteForceService } from '../brute-force.service';

describe('BruteForceService', () => {
  let redis: RedisService;
  let bruteForce: BruteForceService;

  beforeEach(async () => {
    process.env['REDIS_HOST'] = 'localhost';
    redis = new RedisService();
    await redis.onModuleInit();
    bruteForce = new BruteForceService(redis);
  });

  afterEach(async () => {
    await redis.onModuleDestroy();
    delete process.env['REDIS_HOST'];
  });

  it('is not locked before any failures', async () => {
    expect(await bruteForce.isLocked('alice')).toBe(false);
  });

  // Evidence: brute-force protection
  it('locks after 5 recorded failures', async () => {
    for (let i = 0; i < 4; i++) {
      await bruteForce.recordFailure('alice');
      expect(await bruteForce.isLocked('alice')).toBe(false);
    }
    await bruteForce.recordFailure('alice');
    expect(await bruteForce.isLocked('alice')).toBe(true);
  });

  it('reset() clears the failure counter', async () => {
    for (let i = 0; i < 5; i++) await bruteForce.recordFailure('bob');
    expect(await bruteForce.isLocked('bob')).toBe(true);

    await bruteForce.reset('bob');
    expect(await bruteForce.isLocked('bob')).toBe(false);
  });

  it('tracks failures independently per username', async () => {
    for (let i = 0; i < 5; i++) await bruteForce.recordFailure('carol');
    expect(await bruteForce.isLocked('carol')).toBe(true);
    expect(await bruteForce.isLocked('dave')).toBe(false);
  });

  it('is a permissive no-op when Redis is not configured', async () => {
    delete process.env['REDIS_HOST'];
    const unconfiguredRedis = new RedisService();
    await unconfiguredRedis.onModuleInit();
    const unconfigured = new BruteForceService(unconfiguredRedis);

    for (let i = 0; i < 10; i++) await unconfigured.recordFailure('eve');
    expect(await unconfigured.isLocked('eve')).toBe(false);
  });
});
