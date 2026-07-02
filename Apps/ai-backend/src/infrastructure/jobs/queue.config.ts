import { ConnectionOptions } from 'bullmq';
import { getRedisOptions } from '../cache/redis.config';

export const GOAL_EVENTS_QUEUE = 'goal-events';
export const GOAL_EVENTS_DLQ = 'goal-events-dlq';

export function getQueueConnection(): ConnectionOptions | null {
  const options = getRedisOptions();
  if (!options) {
    return null;
  }
  // BullMQ manages its own connection lifecycle; lazyConnect must be off here.
  const { lazyConnect: _lazyConnect, ...rest } = options as Record<string, unknown>;
  return rest as ConnectionOptions;
}
