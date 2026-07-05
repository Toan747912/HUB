import { AgentRegistryService } from '../../../agent-runtime/application/agent-registry.service';
import { MessageType, RoutingFailureReason } from '../../domain/message-types';
import { MessageRouterService } from '../message-router.service';

describe('MessageRouterService', () => {
  let agentRegistry: AgentRegistryService;
  let router: MessageRouterService;

  beforeEach(() => {
    agentRegistry = new AgentRegistryService();
    agentRegistry.register({ id: 'agent-a', name: 'Agent A', workflowId: 'workflow-a' });
    router = new MessageRouterService(agentRegistry);
  });

  it('resolves a REQUEST to a registered receiver as handler-routed', () => {
    const resolution = router.resolve('agent-a', MessageType.REQUEST);
    expect(resolution).toEqual({ ok: true, kind: 'handler', receiverAgentId: 'agent-a' });
  });

  it('rejects a REQUEST to an unknown receiver with a typed failure, never throwing', () => {
    const resolution = router.resolve('ghost-agent', MessageType.REQUEST);
    expect(resolution).toEqual({
      ok: false,
      reason: RoutingFailureReason.UNKNOWN_RECEIVER,
      receiverAgentId: 'ghost-agent',
    });
  });

  it('rejects COMMAND/RESPONSE/ERROR to unknown receivers the same way REQUEST is rejected', () => {
    for (const messageType of [MessageType.COMMAND, MessageType.RESPONSE, MessageType.ERROR]) {
      expect(router.resolve('ghost-agent', messageType).ok).toBe(false);
    }
  });

  it('routes EVENT/NOTIFICATION to subscribers even for an unregistered receiver, with zero subscribers', () => {
    const resolution = router.resolve('unregistered-listener', MessageType.EVENT);
    expect(resolution).toEqual({
      ok: true,
      kind: 'subscribers',
      receiverAgentId: 'unregistered-listener',
      subscriberCount: 0,
    });
  });

  it('subscribe()/getSubscribers() round-trip a registered callback', () => {
    const callback = jest.fn();
    const subscriberId = router.subscribe('listener-1', callback);

    const resolution = router.resolve('listener-1', MessageType.NOTIFICATION);
    expect(resolution).toEqual({ ok: true, kind: 'subscribers', receiverAgentId: 'listener-1', subscriberCount: 1 });

    const subscribers = router.getSubscribers('listener-1');
    expect(subscribers).toHaveLength(1);
    expect(subscribers[0].subscriberId).toBe(subscriberId);
    expect(subscribers[0].callback).toBe(callback);
  });

  it('unsubscribe() removes only the targeted subscriber', () => {
    const idA = router.subscribe('listener-1', jest.fn());
    router.subscribe('listener-1', jest.fn());

    router.unsubscribe('listener-1', idA);

    expect(router.getSubscribers('listener-1')).toHaveLength(1);
    expect(router.getSubscribers('listener-1')[0].subscriberId).not.toBe(idA);
  });

  it('unsubscribe() is a no-op for a receiver with no subscribers', () => {
    expect(() => router.unsubscribe('no-such-listener', 'sub-1')).not.toThrow();
  });
});
