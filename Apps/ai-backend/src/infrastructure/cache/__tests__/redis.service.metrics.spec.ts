import { EventEmitter } from 'events';
import { MetricsService } from '../../observability/metrics.service';

class FakeRedisClient extends EventEmitter {
  connect = jest.fn().mockResolvedValue(undefined);
  ping = jest.fn().mockResolvedValue('PONG');
  quit = jest.fn().mockResolvedValue(undefined);
}

let lastClient: FakeRedisClient | null = null;

jest.mock('ioredis', () => {
  const ctor = jest.fn().mockImplementation(() => {
    lastClient = new FakeRedisClient();
    return lastClient;
  });
  return { __esModule: true, default: ctor };
});

import { RedisService } from '../redis.service';

describe('RedisService — observability wiring', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, REDIS_HOST: 'localhost' };
    lastClient = null;
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('records redis_latency_ms on ping() when a MetricsService is provided', async () => {
    const metrics = new MetricsService();
    const service = new RedisService(metrics);
    await service.onModuleInit();

    await service.ping();

    const text = await metrics.getMetricsText();
    expect(text).toMatch(/redis_latency_ms_count\{operation="ping"\} 1/);

    await service.onModuleDestroy();
  });

  it('works with no MetricsService provided (backward compatible)', async () => {
    const service = new RedisService();
    await service.onModuleInit();
    await expect(service.ping()).resolves.toBe(true);
    await service.onModuleDestroy();
  });
});
