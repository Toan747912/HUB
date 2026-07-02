import { RedisOptions } from 'ioredis';

export function getRedisOptions(): RedisOptions | null {
  const host = process.env['REDIS_HOST'];
  if (!host) {
    return null;
  }

  const port = parseInt(process.env['REDIS_PORT'] ?? '6379', 10);
  const password = process.env['REDIS_PASSWORD'];

  return {
    host,
    port,
    ...(password ? { password } : {}),
    maxRetriesPerRequest: null,
    lazyConnect: true
  };
}

export function isRedisConfigured(): boolean {
  return getRedisOptions() !== null;
}
