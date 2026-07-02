import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import { GoalDomainEvent } from '../../modules/goal/domain/events/goal-event-metadata';
import { MetricsService } from '../observability/metrics.service';
import { SpanFactory } from '../observability/span.factory';
import { TracerService } from '../observability/tracer.service';
import { RedisCircuitBreakerService } from '../resilience/redis-circuit-breaker.service';
import { GOAL_EVENTS_DLQ, GOAL_EVENTS_QUEUE, getQueueConnection } from './queue.config';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private queue: Queue<GoalDomainEvent> | null = null;
  private dlq: Queue<GoalDomainEvent> | null = null;
  private worker: Worker<GoalDomainEvent> | null = null;

  constructor(
    private readonly circuitBreaker: RedisCircuitBreakerService,
    private readonly tracer?: TracerService,
    private readonly metrics?: MetricsService
  ) {}

  onModuleInit(): void {
    const connection = getQueueConnection();
    if (!connection) {
      return;
    }

    this.queue = new Queue<GoalDomainEvent>(GOAL_EVENTS_QUEUE, { connection });
    this.dlq = new Queue<GoalDomainEvent>(GOAL_EVENTS_DLQ, { connection });

    this.worker = new Worker<GoalDomainEvent>(
      GOAL_EVENTS_QUEUE,
      async (job: Job<GoalDomainEvent>) => this.process(job),
      { connection }
    );

    this.worker.on('failed', async (job, err) => {
      if (!job) return;
      const attemptsMade = job.attemptsMade;
      const attemptsLimit = job.opts.attempts ?? 1;
      this.log('job_failed', job.data, { attemptsMade, attemptsLimit, error: err?.message });
      this.metrics?.incrementBullmqJob('failed');

      if (attemptsMade >= attemptsLimit) {
        await this.moveToDeadLetter(job.data, err?.message);
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    await this.dlq?.close().catch(() => undefined);
  }

  isReady(): boolean {
    return this.queue !== null;
  }

  async enqueue(event: GoalDomainEvent): Promise<void> {
    const run = () => this.doEnqueue(event);
    if (!this.tracer) return run();
    return this.tracer.withSpan(
      'bullmq.enqueue',
      SpanFactory.attributesFor({ operation: 'enqueue', aggregateId: event.metadata.aggregateId }),
      run
    );
  }

  private async doEnqueue(event: GoalDomainEvent): Promise<void> {
    if (!this.queue) {
      this.log('enqueue_skipped_no_queue', event);
      return;
    }

    await this.queue.add(event.type, event, {
      jobId: event.metadata.eventId,
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false
    });

    this.log('enqueued', event);
    this.metrics?.incrementBullmqJob('enqueued');
  }

  async moveToDeadLetter(event: GoalDomainEvent, reason?: string): Promise<void> {
    if (!this.dlq) {
      return;
    }
    await this.dlq.add(event.type, event, { jobId: event.metadata.eventId });
    this.log('dead_lettered', event, { reason });
    this.metrics?.incrementBullmqJob('dead_lettered');
  }

  private async process(job: Job<GoalDomainEvent>): Promise<void> {
    const start = Date.now();
    const event = job.data;
    const jobKey = event.type;

    if (job.timestamp) {
      this.metrics?.recordBullmqQueueDelay(start - job.timestamp);
    }

    const canExecute = await this.circuitBreaker.canExecute(jobKey);
    if (!canExecute) {
      throw new Error(`Circuit OPEN for ${jobKey}; refusing to process job ${job.id}`);
    }

    try {
      this.log('job_processing', event, { latencyMs: Date.now() - start });
      await this.circuitBreaker.onSuccess(jobKey);
      this.metrics?.incrementBullmqJob('processed');
    } catch (error) {
      await this.circuitBreaker.onFailure(jobKey);
      throw error;
    }
  }

  private log(event: string, domainEvent: GoalDomainEvent, extra: Record<string, unknown> = {}): void {
    this.logger.log(
      JSON.stringify({
        event,
        traceId: domainEvent.metadata?.traceId,
        queueId: GOAL_EVENTS_QUEUE,
        eventId: domainEvent.metadata?.eventId,
        aggregateId: domainEvent.metadata?.aggregateId,
        eventType: domainEvent.type,
        timestamp: new Date().toISOString(),
        ...extra
      })
    );
  }
}
