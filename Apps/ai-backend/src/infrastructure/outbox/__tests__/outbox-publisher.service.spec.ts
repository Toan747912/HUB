import { GoalDomainEvent } from '../../../modules/goal/domain/events/goal-event-metadata';
import { GoalId } from '../../../shared/domain/identifiers';
import { QueueService } from '../../jobs/queue.service';
import { OutboxPublisherService } from '../outbox-publisher.service';
import { OutboxRepository } from '../outbox.repository';

const makeEvent = (eventId: string): GoalDomainEvent => ({
  type: 'GoalCreated',
  metadata: {
    eventId,
    aggregateId: GoalId.create('goal-1'),
    aggregateType: 'Goal',
    aggregateVersion: 1,
    occurredAt: new Date().toISOString(),
    traceId: 'trace-1',
    correlationId: 'corr-1',
    causationId: 'cause-1',
  },
  payload: { foo: 'bar' },
});

describe('OutboxPublisherService', () => {
  let outbox: jest.Mocked<Pick<OutboxRepository, 'saveMany' | 'markPublished'>>;
  let queue: jest.Mocked<Pick<QueueService, 'enqueue'>>;
  let publisher: OutboxPublisherService;

  beforeEach(() => {
    outbox = {
      saveMany: jest.fn().mockResolvedValue(undefined),
      markPublished: jest.fn().mockResolvedValue(undefined),
    };
    queue = { enqueue: jest.fn().mockResolvedValue(undefined) };
    publisher = new OutboxPublisherService(
      outbox as unknown as OutboxRepository,
      queue as unknown as QueueService,
    );
  });

  it('writes events to the outbox before enqueueing (durability-first)', async () => {
    const callOrder: string[] = [];
    outbox.saveMany.mockImplementation(async () => {
      callOrder.push('saveMany');
    });
    queue.enqueue.mockImplementation(async () => {
      callOrder.push('enqueue');
    });

    await publisher.publishMany([makeEvent('evt-1')]);

    expect(callOrder).toEqual(['saveMany', 'enqueue']);
    expect(outbox.markPublished).toHaveBeenCalledWith('evt-1');
  });

  it('No event loss: leaves the row for the relay to pick up if immediate enqueue fails', async () => {
    queue.enqueue.mockRejectedValueOnce(new Error('queue unavailable'));

    await expect(publisher.publishMany([makeEvent('evt-2')])).resolves.toBeUndefined();

    expect(outbox.saveMany).toHaveBeenCalled();
    expect(outbox.markPublished).not.toHaveBeenCalled();
  });

  it('publish() delegates to publishMany() with a single event', async () => {
    await publisher.publish(makeEvent('evt-3'));
    expect(outbox.saveMany).toHaveBeenCalledWith([
      expect.objectContaining({ metadata: expect.objectContaining({ eventId: 'evt-3' }) }),
    ]);
  });

  it('is a no-op for an empty event list', async () => {
    await publisher.publishMany([]);
    expect(outbox.saveMany).not.toHaveBeenCalled();
  });
});
