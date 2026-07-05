import { OutboxEventDocument } from '../outbox-event.schema';
import { OutboxRelayService } from '../outbox-relay.service';
import { OutboxRepository } from '../outbox.repository';
import { QueueService } from '../../jobs/queue.service';

const pendingDoc = (
  eventId: string,
  overrides: Partial<OutboxEventDocument> = {},
): OutboxEventDocument => ({
  id: eventId,
  eventId,
  aggregateId: 'goal-1',
  aggregateType: 'Goal',
  aggregateVersion: 1,
  eventType: 'GoalCreated',
  payload: { foo: 'bar' },
  occurredAt: new Date(),
  publishedAt: null,
  status: 'PENDING',
  traceId: 'trace-1',
  correlationId: 'corr-1',
  causationId: 'cause-1',
  metadata: {},
  ...overrides,
});

describe('OutboxRelayService', () => {
  let outbox: jest.Mocked<Pick<OutboxRepository, 'findPending' | 'markPublished'>>;
  let queue: jest.Mocked<Pick<QueueService, 'enqueue'>>;
  let relay: OutboxRelayService;

  beforeEach(() => {
    outbox = {
      findPending: jest.fn(),
      markPublished: jest.fn().mockResolvedValue(undefined),
    };
    queue = {
      enqueue: jest.fn().mockResolvedValue(undefined),
    };
    relay = new OutboxRelayService(
      outbox as unknown as OutboxRepository,
      queue as unknown as QueueService,
    );
  });

  // Evidence #7: Outbox replay
  it('re-enqueues every PENDING row and marks it PUBLISHED', async () => {
    outbox.findPending.mockResolvedValue([pendingDoc('evt-1'), pendingDoc('evt-2')]);

    const relayed = await relay.relayPending();

    expect(relayed).toBe(2);
    expect(queue.enqueue).toHaveBeenCalledTimes(2);
    expect(queue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'GoalCreated',
        metadata: expect.objectContaining({ eventId: 'evt-1' }),
      }),
    );
    const [firstCall] = queue.enqueue.mock.calls[0];
    expect(firstCall.metadata.aggregateId.toString()).toBe('goal-1');
    expect(outbox.markPublished).toHaveBeenCalledWith('evt-1');
    expect(outbox.markPublished).toHaveBeenCalledWith('evt-2');
  });

  it('does nothing when there are no pending rows', async () => {
    outbox.findPending.mockResolvedValue([]);

    const relayed = await relay.relayPending();

    expect(relayed).toBe(0);
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('leaves a row PENDING (does not mark published) if enqueue fails', async () => {
    outbox.findPending.mockResolvedValue([pendingDoc('evt-3')]);
    queue.enqueue.mockRejectedValueOnce(new Error('redis unavailable'));

    const relayed = await relay.relayPending();

    expect(relayed).toBe(0);
    expect(outbox.markPublished).not.toHaveBeenCalled();
  });

  // Core regression this phase exists to prevent: traceId/correlationId/causationId
  // must survive create -> persist -> relay unchanged, not be fabricated as
  // 'outbox-relay' / doc.eventId / doc.eventId the way the old relay did.
  it('reconstructs the real traceId/correlationId/causationId/aggregateType from the persisted row instead of fabricating them', async () => {
    outbox.findPending.mockResolvedValue([
      pendingDoc('evt-roundtrip', {
        aggregateId: 'roadmap-1',
        aggregateType: 'Roadmap',
        eventType: 'RoadmapCreated',
        traceId: 'trace-original',
        correlationId: 'corr-original',
        causationId: 'cause-original',
        metadata: { goalId: 'goal-1', plannerVersion: 'v2' },
      }),
    ]);

    await relay.relayPending();

    const [relayedEvent] = queue.enqueue.mock.calls[0];
    expect(relayedEvent.metadata.traceId).toBe('trace-original');
    expect(relayedEvent.metadata.correlationId).toBe('corr-original');
    expect(relayedEvent.metadata.causationId).toBe('cause-original');
    expect(relayedEvent.metadata.aggregateType).toBe('Roadmap');
    // Per-module metadata beyond the base fields (e.g. Roadmap's goalId/plannerVersion)
    // must also round-trip instead of being dropped.
    expect(relayedEvent.metadata).toMatchObject({ goalId: 'goal-1', plannerVersion: 'v2' });
  });
});
