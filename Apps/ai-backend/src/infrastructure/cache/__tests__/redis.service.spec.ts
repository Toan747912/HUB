import { EventEmitter } from 'events';

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
  // Mirror ioredis's CJS/ESM interop shape (`import Redis from 'ioredis'`).
  return { __esModule: true, default: ctor };
});

import { RedisService } from '../redis.service';

describe('RedisService', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    lastClient = null;
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  // Evidence #1: Redis connection
  it('connects and reports ready when REDIS_HOST is configured', async () => {
    process.env['REDIS_HOST'] = 'localhost';
    const service = new RedisService();

    await service.onModuleInit();

    expect(lastClient!.connect).toHaveBeenCalled();
    expect(lastClient!.ping).toHaveBeenCalled();
    expect(service.isConfigured()).toBe(true);
    expect(service.isReady()).toBe(true);
    expect(await service.ping()).toBe(true);

    await service.onModuleDestroy();
    expect(lastClient!.quit).toHaveBeenCalled();
  });

  it('is a no-op when REDIS_HOST is not set', async () => {
    delete process.env['REDIS_HOST'];
    const service = new RedisService();

    await service.onModuleInit();

    expect(lastClient).toBeNull();
    expect(service.isConfigured()).toBe(false);
    expect(service.isReady()).toBe(false);
    expect(await service.ping()).toBe(false);
    expect(() => service.getClient()).toThrow();
  });

  // Evidence #9: Redis outage handling
  it('flips isReady to false when the client emits an error/close, without throwing', async () => {
    process.env['REDIS_HOST'] = 'localhost';
    const service = new RedisService();
    await service.onModuleInit();

    expect(service.isReady()).toBe(true);

    lastClient!.emit('close');
    expect(service.isReady()).toBe(false);

    // Subsequent calls do not throw even while disconnected.
    expect(() => service.getClient()).not.toThrow();

    lastClient!.emit('error', new Error('ECONNRESET'));
    expect(service.isReady()).toBe(false);

    await service.onModuleDestroy();
  });

  // Fail-fast bootstrap
  it('fails fast at startup when configured Redis is unreachable', async () => {
    process.env['REDIS_HOST'] = 'localhost';
    const service = new RedisService();

    const originalMock = require('ioredis').default as jest.Mock;
    originalMock.mockImplementationOnce(() => {
      const client = new FakeRedisClient();
      client.ping.mockRejectedValue(new Error('ECONNREFUSED'));
      lastClient = client;
      return client;
    });

    await expect(service.onModuleInit()).rejects.toThrow(/unreachable at startup/);
  });
});
