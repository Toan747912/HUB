import RedisMock from 'ioredis-mock';

jest.mock('ioredis', () => require('ioredis-mock'));
(RedisMock.prototype as any).connect = jest.fn().mockResolvedValue(undefined);

import { RedisService } from '../../cache/redis.service';
import { GoalLockAcquisitionError, GoalLockService } from '../goal-lock.service';

describe('GoalLockService', () => {
  let redis: RedisService;
  let locks: GoalLockService;

  beforeEach(async () => {
    process.env['REDIS_HOST'] = 'localhost';
    redis = new RedisService();
    await redis.onModuleInit();
    locks = new GoalLockService(redis);
  });

  afterEach(async () => {
    await redis.onModuleDestroy();
    delete process.env['REDIS_HOST'];
  });

  // Evidence #8: Distributed lock behavior
  it('grants a lock and blocks a concurrent lock() on the same goalId', async () => {
    const lock = await locks.lock('goal-1');
    expect(lock.goalId).toBe('goal-1');

    await expect(locks.lock('goal-1')).rejects.toThrow(GoalLockAcquisitionError);

    await locks.unlock(lock);
  }, 10_000);

  it('allows a new lock after unlock releases it', async () => {
    const lock = await locks.lock('goal-2');
    await locks.unlock(lock);

    const secondLock = await locks.lock('goal-2');
    expect(secondLock.goalId).toBe('goal-2');
    await locks.unlock(secondLock);
  });

  it('does not lock a different goalId', async () => {
    const lockA = await locks.lock('goal-a');
    const lockB = await locks.lock('goal-b');

    expect(lockA.goalId).toBe('goal-a');
    expect(lockB.goalId).toBe('goal-b');

    await locks.unlock(lockA);
    await locks.unlock(lockB);
  });

  it('unlock only releases the lock owned by the matching token (compare-and-delete)', async () => {
    const lock = await locks.lock('goal-3');

    // A stale/foreign token must not be able to release someone else's lock.
    await locks.unlock({ goalId: 'goal-3', token: 'not-the-real-token' });

    await expect(locks.lock('goal-3')).rejects.toThrow(GoalLockAcquisitionError);

    await locks.unlock(lock);
  }, 10_000);

  it('is a no-op when Redis is not configured (single-instance/dev mode)', async () => {
    delete process.env['REDIS_HOST'];
    const unconfiguredRedis = new RedisService();
    await unconfiguredRedis.onModuleInit();
    const unconfiguredLocks = new GoalLockService(unconfiguredRedis);

    const lockA = await unconfiguredLocks.lock('goal-x');
    const lockB = await unconfiguredLocks.lock('goal-x');
    expect(lockA.goalId).toBe('goal-x');
    expect(lockB.goalId).toBe('goal-x');
  });
});
