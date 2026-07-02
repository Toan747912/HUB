import { ConnectionOptions } from 'bullmq';
import { getRedisOptions } from '../cache/redis.config';

export const GOAL_EVENTS_QUEUE = 'goal-events';
export const GOAL_EVENTS_DLQ = 'goal-events-dlq';

// Reserved for a future dedicated orchestration queue. Today, every module's
// domain events already flow through GOAL_EVENTS_QUEUE (the outbox relay and
// each module's OutboxPublisherService both enqueue onto that single queue —
// see OutboxRelayService/QueueService), so the platform-orchestration worker
// registers itself as an additional in-process handler on QueueService
// (QueueService#registerHandler) rather than standing up a second BullMQ
// Worker on this name. Two independent `Worker` instances on the SAME queue
// name would compete for jobs (BullMQ's horizontal-scaling semantics), so
// each event would only reach ONE of the two workers — silently dropping
// roughly half the orchestration triggers. Kept as a named constant so a
// genuinely separate queue can be introduced later without a rename.
export const PLATFORM_ORCHESTRATION_QUEUE = 'platform-orchestration';

export function getQueueConnection(): ConnectionOptions | null {
  const options = getRedisOptions();
  if (!options) {
    return null;
  }
  // BullMQ manages its own connection lifecycle; lazyConnect must be off here.
  const { lazyConnect: _lazyConnect, ...rest } = options as Record<string, unknown>;
  return rest as ConnectionOptions;
}
