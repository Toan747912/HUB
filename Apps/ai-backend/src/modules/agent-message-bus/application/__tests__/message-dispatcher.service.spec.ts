import { AgentMessage } from '../../domain/agent-message';
import { MessagePriority } from '../../domain/message-priority';
import { MessageStatus } from '../../domain/message-status';
import { MessageType, RoutingFailureReason, RoutingResolution } from '../../domain/message-types';
import { IMessageHandler } from '../../interfaces/message-handler.interface';
import { AgentRuntimeMessageHandler } from '../agent-runtime-message-handler.service';
import { MessageDispatcherService } from '../message-dispatcher.service';
import { MessageRouterService } from '../message-router.service';
import { MessageStoreService } from '../message-store.service';

function baseMessage(overrides: Partial<AgentMessage> = {}): AgentMessage {
  const now = new Date();
  return {
    messageId: 'msg-1',
    traceId: 'trace-1',
    workflowId: 'plan-1',
    senderAgentId: 'coordinator',
    receiverAgentId: 'agent-a',
    messageType: MessageType.REQUEST,
    priority: MessagePriority.NORMAL,
    payload: {},
    metadata: {},
    createdAt: now,
    updatedAt: now,
    status: MessageStatus.QUEUED,
    retryCount: 0,
    lastError: null,
    ...overrides,
  };
}

/** In-memory fake so recursive retry dispatches see the previous update. */
function fakeStore(initial: AgentMessage): jest.Mocked<Pick<MessageStoreService, 'updateStatus'>> {
  let current = initial;
  return {
    updateStatus: jest.fn(async (_id, status, patch = {}) => {
      current = { ...current, ...patch, status };
      return current;
    }),
  };
}

describe('MessageDispatcherService', () => {
  let router: jest.Mocked<Pick<MessageRouterService, 'resolve' | 'getSubscribers'>>;
  let handler: jest.Mocked<IMessageHandler>;

  beforeEach(() => {
    router = { resolve: jest.fn(), getSubscribers: jest.fn().mockReturnValue([]) };
    handler = { handle: jest.fn() };
  });

  it('delivers a handler-routed message and records the response payload', async () => {
    const resolution: RoutingResolution = { ok: true, kind: 'handler', receiverAgentId: 'agent-a' };
    router.resolve.mockReturnValue(resolution);
    handler.handle.mockResolvedValue({ status: 'DELIVERED', responsePayload: { output: 'ok' } });

    const store = fakeStore(baseMessage());
    const dispatcher = new MessageDispatcherService(
      router as unknown as MessageRouterService,
      store as unknown as MessageStoreService,
      handler as unknown as AgentRuntimeMessageHandler,
    );

    const result = await dispatcher.dispatch(baseMessage());

    expect(result.status).toBe(MessageStatus.DELIVERED);
    expect(result.metadata.response).toEqual({ output: 'ok' });
  });

  it('marks FAILED without retrying when the receiver is unknown', async () => {
    router.resolve.mockReturnValue({
      ok: false,
      reason: RoutingFailureReason.UNKNOWN_RECEIVER,
      receiverAgentId: 'ghost',
    });

    const store = fakeStore(baseMessage({ receiverAgentId: 'ghost' }));
    const dispatcher = new MessageDispatcherService(
      router as unknown as MessageRouterService,
      store as unknown as MessageStoreService,
      handler as unknown as AgentRuntimeMessageHandler,
    );

    const result = await dispatcher.dispatch(baseMessage({ receiverAgentId: 'ghost' }));

    expect(result.status).toBe(MessageStatus.FAILED);
    expect(result.lastError).toContain('UNKNOWN_RECEIVER');
    expect(handler.handle).not.toHaveBeenCalled();
  });

  it('retries a handler failure up to the retry limit, then moves to DEAD_LETTER', async () => {
    router.resolve.mockReturnValue({ ok: true, kind: 'handler', receiverAgentId: 'agent-a' });
    handler.handle.mockResolvedValue({ status: 'FAILED', error: 'runtime unreachable' });

    const store = fakeStore(baseMessage());
    const dispatcher = new MessageDispatcherService(
      router as unknown as MessageRouterService,
      store as unknown as MessageStoreService,
      handler as unknown as AgentRuntimeMessageHandler,
    );

    const result = await dispatcher.dispatch(baseMessage());

    expect(result.status).toBe(MessageStatus.DEAD_LETTER);
    expect(result.retryCount).toBe(4); // 3 retries + the attempt that finally dead-letters
    expect(result.lastError).toBe('runtime unreachable');
    expect(handler.handle).toHaveBeenCalledTimes(4);
  });

  it('fans out an EVENT message to every subscriber callback without calling the agent-runtime handler', async () => {
    router.resolve.mockReturnValue({
      ok: true,
      kind: 'subscribers',
      receiverAgentId: 'listener-1',
      subscriberCount: 2,
    });
    const callbackA = jest.fn();
    const callbackB = jest.fn();
    router.getSubscribers.mockReturnValue([
      { subscriberId: 'a', receiverAgentId: 'listener-1', callback: callbackA },
      { subscriberId: 'b', receiverAgentId: 'listener-1', callback: callbackB },
    ]);

    const store = fakeStore(baseMessage({ receiverAgentId: 'listener-1', messageType: MessageType.EVENT }));
    const dispatcher = new MessageDispatcherService(
      router as unknown as MessageRouterService,
      store as unknown as MessageStoreService,
      handler as unknown as AgentRuntimeMessageHandler,
    );

    const result = await dispatcher.dispatch(
      baseMessage({ receiverAgentId: 'listener-1', messageType: MessageType.EVENT }),
    );

    expect(result.status).toBe(MessageStatus.DELIVERED);
    expect(callbackA).toHaveBeenCalledTimes(1);
    expect(callbackB).toHaveBeenCalledTimes(1);
    expect(handler.handle).not.toHaveBeenCalled();
  });
});
