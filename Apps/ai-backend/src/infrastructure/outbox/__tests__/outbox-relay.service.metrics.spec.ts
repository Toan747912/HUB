import { OutboxEventDocument } from '../outbox-event.schema';
import { OutboxRelayService } from '../outbox-relay.service';
import { OutboxRepository } from '../outbox.repository';
import { QueueService } from '../../jobs/queue.service';
import { MetricsService } from '../../observability/metrics.service';

const pendingDoc = (eventId: string): OutboxEventDocument => ({
  _id: eventId,
  eventId,
  aggregateId: 'goal-1',
  aggregateType: 'Goal',
  aggregateVersion: 1,
  eventType: 'GoalCreated',
  payload: {},
  occurredAt: new Date(),
  publishedAt: null,
  status: 'PENDING',
  traceId: 'trace-1',
  correlationId: 'corr-1',
  causationId: 'cause-1',
  metadata: {}
});

describe('OutboxRelayService — observability wiring', () => {
  let outbox: jest.Mocked<Pick<OutboxRepository, 'findPending' | 'markPublished'>>;
  let queue: jest.Mocked<Pick<QueueService, 'enqueue'>>;
  let metrics: MetricsService;
  let relay: OutboxRelayService;

  beforeEach(() => {
    outbox = { findPending: jest.fn(), markPublished: jest.fn().mockResolvedValue(undefined) };
    queue = { enqueue: jest.fn().mockResolvedValue(undefined) };
    metrics = new MetricsService();
    relay = new OutboxRelayService(outbox as unknown as OutboxRepository, queue as unknown as QueueService, metrics);
  });

  it('sets outbox_pending_total to the count of pending rows found at sweep time', async () => {
    outbox.findPending.mockResolvedValue([pendingDoc('evt-1'), pendingDoc('evt-2'), pendingDoc('evt-3')]);

    await relay.relayPending();

    const text = await metrics.getMetricsText();
    expect(text).toMatch(/outbox_pending_total 3/);
  });

  it('sets outbox_pending_total to 0 when there is no backlog', async () => {
    outbox.findPending.mockResolvedValue([]);
    await relay.relayPending();

    const text = await metrics.getMetricsText();
    expect(text).toMatch(/outbox_pending_total 0/);
  });
});
