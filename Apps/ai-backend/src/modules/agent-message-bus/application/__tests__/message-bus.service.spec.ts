import { AgentMessage } from '../../domain/agent-message';
import { MessageEnvelope } from '../../domain/message-envelope';
import { MessagePriority } from '../../domain/message-priority';
import { MessageStatus } from '../../domain/message-status';
import { MessageType } from '../../domain/message-types';
import { MessageBusService } from '../message-bus.service';
import { MessageDispatcherService } from '../message-dispatcher.service';
import { MessageRouterService } from '../message-router.service';
import { MessageStoreService } from '../message-store.service';

function message(overrides: Partial<AgentMessage> = {}): AgentMessage {
  const now = new Date();
  return {
    messageId: 'msg-1',
    traceId: 'trace-1',
    workflowId: null,
    senderAgentId: 'coordinator',
    receiverAgentId: 'agent-a',
    messageType: MessageType.REQUEST,
    priority: MessagePriority.NORMAL,
    payload: {},
    metadata: {},
    createdAt: now,
    updatedAt: now,
    status: MessageStatus.CREATED,
    retryCount: 0,
    lastError: null,
    ...overrides,
  };
}

describe('MessageBusService', () => {
  let store: jest.Mocked<Pick<MessageStoreService, 'create' | 'updateStatus' | 'findById' | 'findByStatus'>>;
  let router: jest.Mocked<Pick<MessageRouterService, 'subscribe' | 'unsubscribe'>>;
  let dispatcher: jest.Mocked<Pick<MessageDispatcherService, 'dispatch'>>;
  let bus: MessageBusService;

  const envelope: MessageEnvelope = {
    traceId: 'trace-1',
    senderAgentId: 'coordinator',
    receiverAgentId: 'agent-a',
    messageType: MessageType.REQUEST,
    payload: { goal: 'summarize' },
  };

  beforeEach(() => {
    store = {
      create: jest.fn(),
      updateStatus: jest.fn(),
      findById: jest.fn(),
      findByStatus: jest.fn().mockResolvedValue([]),
    };
    router = { subscribe: jest.fn(), unsubscribe: jest.fn() };
    dispatcher = { dispatch: jest.fn() };
    bus = new MessageBusService(
      store as unknown as MessageStoreService,
      router as unknown as MessageRouterService,
      dispatcher as unknown as MessageDispatcherService,
    );
  });

  it('publish() creates the message directly as QUEUED (one write, not create-then-update) and dispatches it', async () => {
    const queued = message({ status: MessageStatus.QUEUED });
    const delivered = message({ status: MessageStatus.DELIVERED });
    store.create.mockResolvedValue(queued);
    dispatcher.dispatch.mockResolvedValue(delivered);

    const result = await bus.publish(envelope);

    expect(store.create).toHaveBeenCalledWith(envelope, MessageStatus.QUEUED);
    expect(store.updateStatus).not.toHaveBeenCalled();
    expect(dispatcher.dispatch).toHaveBeenCalledWith(queued);
    expect(result).toBe(delivered);
  });

  it('subscribe()/unsubscribe() delegate to the router', () => {
    router.subscribe.mockReturnValue('sub-1');
    const callback = jest.fn();

    expect(bus.subscribe('listener-1', callback)).toBe('sub-1');
    expect(router.subscribe).toHaveBeenCalledWith('listener-1', callback);

    bus.unsubscribe('listener-1', 'sub-1');
    expect(router.unsubscribe).toHaveBeenCalledWith('listener-1', 'sub-1');
  });

  it('dispatch(messageId) looks the message up and forwards it to the dispatcher', async () => {
    const found = message();
    store.findById.mockResolvedValue(found);
    dispatcher.dispatch.mockResolvedValue(message({ status: MessageStatus.DELIVERED }));

    const result = await bus.dispatch('msg-1');

    expect(dispatcher.dispatch).toHaveBeenCalledWith(found);
    expect(result.status).toBe(MessageStatus.DELIVERED);
  });

  it('dispatch(messageId) throws for an unknown message id', async () => {
    store.findById.mockResolvedValue(null);
    await expect(bus.dispatch('missing')).rejects.toThrow('Agent message not found: missing');
  });

  it('retry() re-queues a message and re-dispatches it', async () => {
    const found = message({ status: MessageStatus.FAILED, lastError: 'boom' });
    const requeued = message({ status: MessageStatus.QUEUED, lastError: null });
    store.findById.mockResolvedValue(found);
    store.updateStatus.mockResolvedValue(requeued);
    dispatcher.dispatch.mockResolvedValue(message({ status: MessageStatus.DELIVERED }));

    await bus.retry('msg-1');

    expect(store.updateStatus).toHaveBeenCalledWith('msg-1', MessageStatus.QUEUED, { lastError: null });
    expect(dispatcher.dispatch).toHaveBeenCalledWith(requeued);
  });

  it('deadLetter() sets the message to DEAD_LETTER with the given reason', async () => {
    store.findById.mockResolvedValue(message());
    const deadLettered = message({ status: MessageStatus.DEAD_LETTER, lastError: 'manual dead-letter' });
    store.updateStatus.mockResolvedValue(deadLettered);

    const result = await bus.deadLetter('msg-1', 'manual dead-letter');

    expect(store.updateStatus).toHaveBeenCalledWith('msg-1', MessageStatus.DEAD_LETTER, {
      lastError: 'manual dead-letter',
    });
    expect(result).toBe(deadLettered);
  });

  it('replay() resets retryCount/lastError and re-dispatches from QUEUED', async () => {
    store.findById.mockResolvedValue(message({ status: MessageStatus.DEAD_LETTER, retryCount: 4 }));
    const requeued = message({ status: MessageStatus.QUEUED, retryCount: 0, lastError: null });
    store.updateStatus.mockResolvedValue(requeued);
    dispatcher.dispatch.mockResolvedValue(message({ status: MessageStatus.DELIVERED }));

    await bus.replay('msg-1');

    expect(store.updateStatus).toHaveBeenCalledWith('msg-1', MessageStatus.QUEUED, {
      retryCount: 0,
      lastError: null,
    });
    expect(dispatcher.dispatch).toHaveBeenCalledWith(requeued);
  });

  it('lookup() delegates to the store', async () => {
    store.findById.mockResolvedValue(null);
    await expect(bus.lookup('missing')).resolves.toBeNull();
  });

  it('onModuleInit recovers every in-flight message and resumes dispatching it', async () => {
    const inFlight = [
      message({ messageId: 'msg-1', status: MessageStatus.QUEUED }),
      message({ messageId: 'msg-2', status: MessageStatus.RETRYING }),
    ];
    store.findByStatus.mockResolvedValue(inFlight);
    dispatcher.dispatch.mockResolvedValue(message({ status: MessageStatus.DELIVERED }));

    await bus.onModuleInit();

    expect(store.findByStatus).toHaveBeenCalledWith([
      MessageStatus.QUEUED,
      MessageStatus.DELIVERING,
      MessageStatus.RETRYING,
    ]);
    expect(dispatcher.dispatch).toHaveBeenCalledTimes(2);
    expect(dispatcher.dispatch).toHaveBeenCalledWith(inFlight[0]);
    expect(dispatcher.dispatch).toHaveBeenCalledWith(inFlight[1]);
  });

  it('works without the optional observability collaborators', async () => {
    store.create.mockResolvedValue(message());
    store.updateStatus.mockResolvedValue(message({ status: MessageStatus.QUEUED }));
    dispatcher.dispatch.mockResolvedValue(message({ status: MessageStatus.DELIVERED }));

    const bareBus = new MessageBusService(
      store as unknown as MessageStoreService,
      router as unknown as MessageRouterService,
      dispatcher as unknown as MessageDispatcherService,
    );

    await expect(bareBus.publish(envelope)).resolves.toEqual(expect.objectContaining({ status: MessageStatus.DELIVERED }));
  });
});
