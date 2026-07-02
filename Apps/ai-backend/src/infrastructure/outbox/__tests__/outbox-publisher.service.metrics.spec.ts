import { GoalDomainEvent } from '../../../modules/goal/domain/events/goal-event-metadata';
import { AuditLogService } from '../../audit/audit-log.service';
import { QueueService } from '../../jobs/queue.service';
import { MetricsService } from '../../observability/metrics.service';
import { TracerService } from '../../observability/tracer.service';
import { OutboxPublisherService } from '../outbox-publisher.service';
import { OutboxRepository } from '../outbox.repository';

const makeEvent = (type: GoalDomainEvent['type'], eventId: string): GoalDomainEvent => ({
  type,
  metadata: {
    eventId,
    aggregateId: 'goal-1',
    aggregateVersion: 1,
    occurredAt: new Date().toISOString(),
    traceId: 'trace-1',
    correlationId: 'corr-1',
    causationId: 'cause-1'
  },
  payload: { foo: 'bar' }
});

describe('OutboxPublisherService — observability wiring', () => {
  let outbox: jest.Mocked<Pick<OutboxRepository, 'saveMany' | 'markPublished'>>;
  let queue: jest.Mocked<Pick<QueueService, 'enqueue'>>;
  let tracer: { withSpan: jest.Mock };
  let metrics: MetricsService;
  let auditLog: jest.Mocked<Pick<AuditLogService, 'recordFromDomainEvent'>>;
  let publisher: OutboxPublisherService;

  beforeEach(() => {
    outbox = { saveMany: jest.fn().mockResolvedValue(undefined), markPublished: jest.fn().mockResolvedValue(undefined) };
    queue = { enqueue: jest.fn().mockResolvedValue(undefined) };
    tracer = { withSpan: jest.fn(async (_name, _attrs, fn) => fn()) };
    metrics = new MetricsService();
    auditLog = { recordFromDomainEvent: jest.fn().mockResolvedValue(undefined) };

    publisher = new OutboxPublisherService(
      outbox as unknown as OutboxRepository,
      queue as unknown as QueueService,
      tracer as unknown as TracerService,
      metrics,
      auditLog as unknown as AuditLogService
    );
  });

  it('wraps publishMany in a span', async () => {
    await publisher.publishMany([makeEvent('GoalCreated', 'evt-1')]);
    expect(tracer.withSpan).toHaveBeenCalledWith('outbox.publishMany', expect.objectContaining({ operation: 'publishMany' }), expect.any(Function));
  });

  it('increments goal_created_total for a GoalCreated event', async () => {
    await publisher.publishMany([makeEvent('GoalCreated', 'evt-1')]);
    const text = await metrics.getMetricsText();
    expect(text).toMatch(/goal_created_total 1/);
  });

  it('increments goal_completed_total for a GoalCompleted event', async () => {
    await publisher.publishMany([makeEvent('GoalCompleted', 'evt-2')]);
    const text = await metrics.getMetricsText();
    expect(text).toMatch(/goal_completed_total 1/);
  });

  it('does not increment goal counters for other event types', async () => {
    await publisher.publishMany([makeEvent('GoalUpdated', 'evt-3')]);
    const text = await metrics.getMetricsText();
    expect(text).toMatch(/goal_created_total 0/);
    expect(text).toMatch(/goal_completed_total 0/);
  });

  it('calls auditLog.recordFromDomainEvent for every published event', async () => {
    const event = makeEvent('GoalCreated', 'evt-4');
    await publisher.publishMany([event]);
    expect(auditLog.recordFromDomainEvent).toHaveBeenCalledWith(event);
  });

  it('does not fail publishMany if audit logging throws', async () => {
    auditLog.recordFromDomainEvent.mockRejectedValueOnce(new Error('audit db down'));
    await expect(publisher.publishMany([makeEvent('GoalCreated', 'evt-5')])).resolves.toBeUndefined();
  });

  it('works with no observability params provided (backward compatible)', async () => {
    const plain = new OutboxPublisherService(outbox as unknown as OutboxRepository, queue as unknown as QueueService);
    await expect(plain.publishMany([makeEvent('GoalCreated', 'evt-6')])).resolves.toBeUndefined();
  });
});
