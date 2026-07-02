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
import { MetricsService } from '../../observability/metrics.service';
import { TracerService } from '../../observability/tracer.service';
import { RedisCircuitBreakerService } from '../../resilience/redis-circuit-breaker.service';
import { QueueService } from '../queue.service';

const makeEvent = (): GoalDomainEvent => ({
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
  payload: {}
});

describe('QueueService — observability wiring', () => {
  let breaker: jest.Mocked<Pick<RedisCircuitBreakerService, 'canExecute' | 'onSuccess' | 'onFailure'>>;
  let tracer: { withSpan: jest.Mock };
  let metrics: MetricsService;
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
    tracer = { withSpan: jest.fn(async (_name, _attrs, fn) => fn()) };
    metrics = new MetricsService();

    service = new QueueService(breaker as unknown as RedisCircuitBreakerService, tracer as unknown as TracerService, metrics);
    service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    delete process.env['REDIS_HOST'];
  });

  it('wraps enqueue in a span', async () => {
    await service.enqueue(makeEvent());
    expect(tracer.withSpan).toHaveBeenCalledWith(
      'bullmq.enqueue',
      expect.objectContaining({ operation: 'enqueue', aggregateId: 'goal-1' }),
      expect.any(Function)
    );
  });

  it('increments bullmq_jobs_total{status="enqueued"} on enqueue', async () => {
    await service.enqueue(makeEvent());
    const text = await metrics.getMetricsText();
    expect(text).toMatch(/bullmq_jobs_total\{status="enqueued"\} 1/);
  });

  it('increments bullmq_jobs_total{status="processed"} on successful processing', async () => {
    const [worker] = bullmq.__instances.workers;
    await worker.processor({ id: '1', data: makeEvent(), attemptsMade: 0, opts: { attempts: 5 }, timestamp: Date.now() - 50 });

    const text = await metrics.getMetricsText();
    expect(text).toMatch(/bullmq_jobs_total\{status="processed"\} 1/);
    expect(text).toMatch(/bullmq_queue_delay_ms_count 1/);
  });

  it('increments bullmq_jobs_total{status="dead_lettered"} once attempts are exhausted', async () => {
    const [worker] = bullmq.__instances.workers;
    await worker.handlers['failed']({ id: '1', data: makeEvent(), attemptsMade: 5, opts: { attempts: 5 } }, new Error('boom'));

    const text = await metrics.getMetricsText();
    expect(text).toMatch(/bullmq_jobs_total\{status="failed"\} 1/);
    expect(text).toMatch(/bullmq_jobs_total\{status="dead_lettered"\} 1/);
  });
});
