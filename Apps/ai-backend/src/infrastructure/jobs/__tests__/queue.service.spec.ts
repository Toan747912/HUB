jest.mock('bullmq', () => {
  const instances = { queues: [] as any[], workers: [] as any[] };

  class Queue {
    name: string;
    add = jest.fn().mockResolvedValue(undefined);
    close = jest.fn().mockResolvedValue(undefined);
    constructor(name: string, _opts: any) {
      this.name = name;
      instances.queues.push(this);
    }
  }

  class Worker {
    handlers: Record<string, (...args: any[]) => any> = {};
    close = jest.fn().mockResolvedValue(undefined);
    constructor(
      public name: string,
      public processor: (job: any) => Promise<void>,
      public opts: any
    ) {
      instances.workers.push(this);
    }
    on(event: string, handler: (...args: any[]) => any) {
      this.handlers[event] = handler;
      return this;
    }
  }

  return { Queue, Worker, __instances: instances };
});

import { GoalDomainEvent } from '../../../modules/goal/domain/events/goal-event-metadata';
import { GoalId } from '../../../shared/domain/identifiers';
import { RedisCircuitBreakerService } from '../../resilience/redis-circuit-breaker.service';
import { QueueService } from '../queue.service';

const makeEvent = (overrides: Partial<GoalDomainEvent> = {}): GoalDomainEvent => ({
  type: 'GoalCreated',
  metadata: {
    eventId: 'evt-1',
    aggregateId: GoalId.create('goal-1'),
    aggregateType: 'Goal',
    aggregateVersion: 1,
    occurredAt: new Date().toISOString(),
    traceId: 'trace-1',
    correlationId: 'corr-1',
    causationId: 'cause-1'
  },
  payload: { foo: 'bar' },
  ...overrides
});

describe('QueueService', () => {
  let breaker: jest.Mocked<Pick<RedisCircuitBreakerService, 'canExecute' | 'onSuccess' | 'onFailure'>>;
  let service: QueueService;
  let bullmq: any;

  beforeEach(() => {
    process.env['REDIS_HOST'] = 'localhost';
    bullmq = require('bullmq');
    bullmq.__instances.queues.length = 0;
    bullmq.__instances.workers.length = 0;

    breaker = {
      canExecute: jest.fn().mockResolvedValue(true),
      onSuccess: jest.fn().mockResolvedValue(undefined),
      onFailure: jest.fn().mockResolvedValue(undefined)
    } as any;

    service = new QueueService(breaker as unknown as RedisCircuitBreakerService);
    service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    delete process.env['REDIS_HOST'];
  });

  it('is not ready when Redis is not configured', () => {
    delete process.env['REDIS_HOST'];
    const unconfigured = new QueueService(breaker as unknown as RedisCircuitBreakerService);
    unconfigured.onModuleInit();
    expect(unconfigured.isReady()).toBe(false);
  });

  it('is ready and creates a goal-events queue + a DLQ queue when Redis is configured', () => {
    expect(service.isReady()).toBe(true);
    expect(bullmq.__instances.queues.map((q: any) => q.name)).toEqual(['goal-events', 'goal-events-dlq']);
  });

  // Evidence #2: Queue enqueue
  it('enqueues an event with idempotent jobId and retry/backoff policy', async () => {
    const event = makeEvent();
    await service.enqueue(event);

    const [mainQueue] = bullmq.__instances.queues;
    expect(mainQueue.add).toHaveBeenCalledWith(
      event.type,
      event,
      expect.objectContaining({
        jobId: event.metadata.eventId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 }
      })
    );
  });

  it('enqueue is a safe no-op when Redis is not configured', async () => {
    delete process.env['REDIS_HOST'];
    const unconfigured = new QueueService(breaker as unknown as RedisCircuitBreakerService);
    unconfigured.onModuleInit();

    await expect(unconfigured.enqueue(makeEvent())).resolves.toBeUndefined();
  });

  // Evidence #3: Queue processing
  it('processing a job checks the circuit breaker and reports success', async () => {
    const [worker] = bullmq.__instances.workers;
    const event = makeEvent();

    await worker.processor({ id: '1', data: event, attemptsMade: 0, opts: { attempts: 5 } });

    expect(breaker.canExecute).toHaveBeenCalledWith(event.type);
    expect(breaker.onSuccess).toHaveBeenCalledWith(event.type);
  });

  it('processing refuses to run when the circuit is OPEN', async () => {
    breaker.canExecute.mockResolvedValueOnce(false);
    const [worker] = bullmq.__instances.workers;
    const event = makeEvent();

    await expect(worker.processor({ id: '1', data: event, attemptsMade: 0, opts: { attempts: 5 } })).rejects.toThrow(
      /Circuit OPEN/
    );
  });

  // Evidence #4: Retry execution — not yet exhausted, no dead-letter move
  it('does not dead-letter a job while retries remain', async () => {
    const [worker] = bullmq.__instances.workers;
    const [, dlq] = bullmq.__instances.queues;
    const event = makeEvent();
    const job = { id: '1', data: event, attemptsMade: 2, opts: { attempts: 5 } };

    await worker.handlers['failed'](job, new Error('transient failure'));

    expect(dlq.add).not.toHaveBeenCalled();
  });

  // Evidence #5: Dead-letter handling
  it('moves a job to the dead-letter queue once attempts are exhausted', async () => {
    const [worker] = bullmq.__instances.workers;
    const [, dlq] = bullmq.__instances.queues;
    const event = makeEvent();
    const job = { id: '1', data: event, attemptsMade: 5, opts: { attempts: 5 } };

    await worker.handlers['failed'](job, new Error('permanent failure'));

    expect(dlq.add).toHaveBeenCalledWith(event.type, event, expect.objectContaining({ jobId: event.metadata.eventId }));
  });
});
