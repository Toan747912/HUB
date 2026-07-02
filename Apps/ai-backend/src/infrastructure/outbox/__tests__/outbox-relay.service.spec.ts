import { OutboxEventDocument } from '../outbox-event.schema';
import { OutboxRelayService } from '../outbox-relay.service';
import { OutboxRepository } from '../outbox.repository';
import { QueueService } from '../../jobs/queue.service';

const pendingDoc = (eventId: string): OutboxEventDocument => ({
  _id: eventId,
  eventId,
  aggregateId: 'goal-1',
  aggregateVersion: 1,
  eventType: 'GoalCreated',
  payload: { foo: 'bar' },
  occurredAt: new Date(),
  publishedAt: null,
  status: 'PENDING'
});

describe('OutboxRelayService', () => {
  let outbox: jest.Mocked<Pick<OutboxRepository, 'findPending' | 'markPublished'>>;
  let queue: jest.Mocked<Pick<QueueService, 'enqueue'>>;
  let relay: OutboxRelayService;

  beforeEach(() => {
    outbox = {
      findPending: jest.fn(),
      markPublished: jest.fn().mockResolvedValue(undefined)
    };
    queue = {
      enqueue: jest.fn().mockResolvedValue(undefined)
    };
    relay = new OutboxRelayService(outbox as unknown as OutboxRepository, queue as unknown as QueueService);
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
        metadata: expect.objectContaining({ eventId: 'evt-1', aggregateId: 'goal-1' })
      })
    );
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
});
