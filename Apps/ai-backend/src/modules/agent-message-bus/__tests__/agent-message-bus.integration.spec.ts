import { AgentRuntimeService } from '../../agent-runtime/application/agent-runtime.service';
import { AgentRegistryService } from '../../agent-runtime/application/agent-registry.service';
import { RuntimeContextFactory } from '../../agent-runtime/application/runtime-context.factory';
import { RuntimeExecutor } from '../../agent-runtime/application/runtime-executor';
import { WorkflowRegistryService } from '../../agent-runtime/application/workflow-registry.service';
import { RuntimeStepDefinition } from '../../agent-runtime/domain/runtime.types';
import { AgentRuntimeMessageHandler } from '../application/agent-runtime-message-handler.service';
import { MessageBusService } from '../application/message-bus.service';
import { MessageDispatcherService } from '../application/message-dispatcher.service';
import { MessageRouterService } from '../application/message-router.service';
import { MessageStoreService } from '../application/message-store.service';
import { AgentMessage } from '../domain/agent-message';
import { MessagePriority } from '../domain/message-priority';
import { MessageStatus } from '../domain/message-status';
import { MessageType } from '../domain/message-types';
import { IMessageRepository } from '../domain/message-types';

/**
 * In-memory stand-in for the Mongo-backed message repository so this
 * integration test exercises the real Bus -> Router -> Dispatcher ->
 * AgentRuntimeService chain (and the real RuntimeExecutor/registries)
 * without needing a database.
 */
class InMemoryMessageRepository implements IMessageRepository {
  private readonly messages = new Map<string, AgentMessage>();

  async create(message: AgentMessage): Promise<AgentMessage> {
    this.messages.set(message.messageId, message);
    return message;
  }

  async update(messageId: string, patch: Partial<AgentMessage>): Promise<AgentMessage> {
    const current = this.messages.get(messageId);
    if (!current) {
      throw new Error(`Agent message not found: ${messageId}`);
    }
    const updated = { ...current, ...patch };
    this.messages.set(messageId, updated);
    return updated;
  }

  async findById(messageId: string): Promise<AgentMessage | null> {
    return this.messages.get(messageId) ?? null;
  }

  async findByStatus(statuses: MessageStatus[]): Promise<AgentMessage[]> {
    return [...this.messages.values()].filter((m) => statuses.includes(m.status));
  }

  async findByTraceId(traceId: string): Promise<AgentMessage[]> {
    return [...this.messages.values()].filter((m) => m.traceId === traceId);
  }

  async deleteTerminalOlderThan(): Promise<number> {
    return 0;
  }

  seed(message: AgentMessage): void {
    this.messages.set(message.messageId, message);
  }
}

function buildRuntime(executor: Pick<RuntimeExecutor, 'executeStep'>): {
  agentRegistry: AgentRegistryService;
  agentRuntime: AgentRuntimeService;
} {
  const agentRegistry = new AgentRegistryService();
  agentRegistry.register({ id: 'discovery-agent', name: 'Discovery Agent', workflowId: 'discovery-workflow' });

  const workflowRegistry = new WorkflowRegistryService();
  const steps: RuntimeStepDefinition[] = [
    { stepId: 'discover', name: 'Discover', kind: 'planner', target: 'discovery_planner' },
  ];
  workflowRegistry.register({ workflowId: 'discovery-workflow', name: 'Discovery', steps });

  const agentRuntime = new AgentRuntimeService(
    agentRegistry,
    workflowRegistry,
    new RuntimeContextFactory(),
    executor as RuntimeExecutor,
  );

  return { agentRegistry, agentRuntime };
}

describe('agent-message-bus integration', () => {
  it('delivers a REQUEST end to end: Bus -> Router -> Dispatcher -> AgentRuntimeService -> Planner step', async () => {
    const executor: jest.Mocked<Pick<RuntimeExecutor, 'executeStep'>> = { executeStep: jest.fn() };
    executor.executeStep.mockImplementation(async (step, _ctx, state) => {
      state.completeStep(step.stepId, { profile: 'visual-learner' });
    });
    const { agentRegistry, agentRuntime } = buildRuntime(executor);

    const repository = new InMemoryMessageRepository();
    const store = new MessageStoreService(repository);
    const router = new MessageRouterService(agentRegistry);
    const handler = new AgentRuntimeMessageHandler(agentRuntime);
    const dispatcher = new MessageDispatcherService(router, store, handler);
    const bus = new MessageBusService(store, router, dispatcher);

    const result = await bus.publish({
      traceId: 'trace-1',
      workflowId: 'plan-1',
      senderAgentId: 'coordinator',
      receiverAgentId: 'discovery-agent',
      messageType: MessageType.REQUEST,
      payload: { requestId: 'req-1', agentId: 'discovery-agent', goal: 'discover', input: {}, context: { traceId: 'trace-1', userId: 'user-1', metadata: {} } },
    });

    expect(result.status).toBe(MessageStatus.DELIVERED);
    expect(result.metadata.response).toEqual(
      expect.objectContaining({ status: 'success', output: { discover: { profile: 'visual-learner' } } }),
    );
    expect(executor.executeStep).toHaveBeenCalledTimes(1);
  });

  it('rejects delivery to an unregistered agent without ever calling the runtime', async () => {
    const executor: jest.Mocked<Pick<RuntimeExecutor, 'executeStep'>> = { executeStep: jest.fn() };
    const { agentRegistry, agentRuntime } = buildRuntime(executor);
    const runSpy = jest.spyOn(agentRuntime, 'run');

    const repository = new InMemoryMessageRepository();
    const store = new MessageStoreService(repository);
    const router = new MessageRouterService(agentRegistry);
    const handler = new AgentRuntimeMessageHandler(agentRuntime);
    const dispatcher = new MessageDispatcherService(router, store, handler);
    const bus = new MessageBusService(store, router, dispatcher);

    const result = await bus.publish({
      traceId: 'trace-1',
      senderAgentId: 'coordinator',
      receiverAgentId: 'ghost-agent',
      messageType: MessageType.REQUEST,
      payload: {},
    });

    expect(result.status).toBe(MessageStatus.FAILED);
    expect(result.lastError).toContain('UNKNOWN_RECEIVER');
    expect(runSpy).not.toHaveBeenCalled();
  });

  it('recovers QUEUED/DELIVERING/RETRYING messages on startup and resumes dispatching them', async () => {
    const executor: jest.Mocked<Pick<RuntimeExecutor, 'executeStep'>> = { executeStep: jest.fn() };
    executor.executeStep.mockImplementation(async (step, _ctx, state) => {
      state.completeStep(step.stepId, { profile: 'visual-learner' });
    });
    const { agentRegistry, agentRuntime } = buildRuntime(executor);

    const repository = new InMemoryMessageRepository();
    const now = new Date();
    const strandedMessage: AgentMessage = {
      messageId: 'msg-stranded',
      traceId: 'trace-2',
      workflowId: 'plan-2',
      senderAgentId: 'coordinator',
      receiverAgentId: 'discovery-agent',
      messageType: MessageType.REQUEST,
      priority: MessagePriority.NORMAL,
      payload: { requestId: 'req-2', agentId: 'discovery-agent', goal: 'discover', input: {}, context: { traceId: 'trace-2', userId: 'user-1', metadata: {} } },
      metadata: {},
      createdAt: now,
      updatedAt: now,
      status: MessageStatus.DELIVERING,
      retryCount: 0,
      lastError: null,
    };
    repository.seed(strandedMessage);

    const store = new MessageStoreService(repository);
    const router = new MessageRouterService(agentRegistry);
    const handler = new AgentRuntimeMessageHandler(agentRuntime);
    const dispatcher = new MessageDispatcherService(router, store, handler);
    const bus = new MessageBusService(store, router, dispatcher);

    await bus.onModuleInit();

    const recovered = await bus.lookup('msg-stranded');
    expect(recovered?.status).toBe(MessageStatus.DELIVERED);
    expect(executor.executeStep).toHaveBeenCalledTimes(1);
  });
});
