import { IAgentContext } from '../../agent-core/domain/interfaces';
import { MemoryStoreService } from '../../agent-memory/application/memory-store.service';
import { MemoryRecord } from '../../agent-memory/domain/memory-record';
import { MemoryScope } from '../../agent-memory/domain/memory-scope';
import {
  IMemoryRepository,
  MemoryDeleteInput,
  MemoryGetInput,
  MemorySetInput,
} from '../../agent-memory/domain/memory.types';
import { AgentRuntimeMessageHandler } from '../../agent-message-bus/application/agent-runtime-message-handler.service';
import { MessageBusService } from '../../agent-message-bus/application/message-bus.service';
import { MessageDispatcherService } from '../../agent-message-bus/application/message-dispatcher.service';
import { MessageRouterService } from '../../agent-message-bus/application/message-router.service';
import { MessageStoreService } from '../../agent-message-bus/application/message-store.service';
import { AgentMessage } from '../../agent-message-bus/domain/agent-message';
import { IMessageRepository } from '../../agent-message-bus/domain/message-types';
import { MessageStatus } from '../../agent-message-bus/domain/message-status';
import { AgentRegistryService } from '../../agent-runtime/application/agent-registry.service';
import { AgentRuntimeService } from '../../agent-runtime/application/agent-runtime.service';
import { RuntimeContextFactory } from '../../agent-runtime/application/runtime-context.factory';
import { RuntimeExecutor } from '../../agent-runtime/application/runtime-executor';
import { WorkflowRegistryService } from '../../agent-runtime/application/workflow-registry.service';
import { RuntimeStepDefinition } from '../../agent-runtime/domain/runtime.types';
import { AgentSelectionService } from '../application/agent-selection.service';
import { CoordinatorService } from '../application/coordinator.service';
import { ExecutionPlanService } from '../application/execution-plan.service';

/**
 * In-memory stand-in for the Mongo-backed memory repository, so this
 * integration test exercises the real MemoryStoreService (and therefore the
 * real shared-memory handoff path) without needing a database.
 */
class InMemoryMemoryRepository implements IMemoryRepository {
  private readonly records = new Map<string, MemoryRecord>();

  private key(scope: MemoryScope, scopeId: string, keyName: string): string {
    return `${scope}:${scopeId}:${keyName}`;
  }

  async set(input: MemorySetInput): Promise<MemoryRecord> {
    const now = new Date();
    const record: MemoryRecord = {
      id: this.key(input.scope, input.scopeId, input.key),
      scope: input.scope,
      scopeId: input.scopeId,
      key: input.key,
      value: input.value,
      createdAt: now,
      updatedAt: now,
      expiresAt: null,
      version: 1,
      tags: input.tags ?? [],
    };
    this.records.set(record.id, record);
    return record;
  }

  async get(input: MemoryGetInput): Promise<MemoryRecord | null> {
    return this.records.get(this.key(input.scope, input.scopeId, input.key)) ?? null;
  }

  async delete(input: MemoryDeleteInput): Promise<boolean> {
    return this.records.delete(this.key(input.scope, input.scopeId, input.key));
  }

  async list(scope: MemoryScope, scopeId: string): Promise<MemoryRecord[]> {
    return [...this.records.values()].filter((r) => r.scope === scope && r.scopeId === scopeId);
  }

  async queryByTag(tag: string): Promise<MemoryRecord[]> {
    return [...this.records.values()].filter((r) => r.tags.includes(tag));
  }

  async queryByScope(scope: MemoryScope): Promise<MemoryRecord[]> {
    return [...this.records.values()].filter((r) => r.scope === scope);
  }

  async deleteExpired(): Promise<number> {
    return 0;
  }
}

/**
 * In-memory stand-in for the Mongo-backed message repository, so this
 * integration test exercises the real MessageBusService/MessageRouterService/
 * MessageDispatcherService (and therefore the real Coordinator -> Message
 * Bus -> Dispatcher -> AgentRuntimeService handoff) without needing a
 * database.
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
}

function context(): IAgentContext {
  return { traceId: 'trace-1', userId: 'user-1', sessionId: 'session-1', metadata: {} };
}

describe('agent-coordinator integration (via the Agent Message Bus)', () => {
  let coordinator: CoordinatorService;
  let memoryRepository: InMemoryMemoryRepository;
  let messageRepository: InMemoryMessageRepository;
  let executor: jest.Mocked<Pick<RuntimeExecutor, 'executeStep'>>;
  let runSpy: jest.SpyInstance;

  beforeEach(() => {
    const agentRegistry = new AgentRegistryService();
    agentRegistry.register({ id: 'discovery-agent', name: 'Discovery Agent', workflowId: 'discovery-workflow' });
    agentRegistry.register({ id: 'teaching-agent', name: 'Teaching Agent', workflowId: 'teaching-workflow' });

    const workflowRegistry = new WorkflowRegistryService();
    const discoverySteps: RuntimeStepDefinition[] = [
      { stepId: 'discover', name: 'Discover', kind: 'planner', target: 'discovery_planner' },
    ];
    const teachingSteps: RuntimeStepDefinition[] = [
      { stepId: 'teach', name: 'Teach', kind: 'planner', target: 'teaching_planner' },
    ];
    workflowRegistry.register({ workflowId: 'discovery-workflow', name: 'Discovery', steps: discoverySteps });
    workflowRegistry.register({ workflowId: 'teaching-workflow', name: 'Teaching', steps: teachingSteps });

    executor = { executeStep: jest.fn() };
    executor.executeStep.mockImplementation(async (step, _ctx, state) => {
      if (step.stepId === 'discover') {
        state.completeStep(step.stepId, { profile: 'visual-learner' });
        return;
      }
      state.completeStep(step.stepId, { confidence: 0.8 });
    });

    const agentRuntime = new AgentRuntimeService(
      agentRegistry,
      workflowRegistry,
      new RuntimeContextFactory(),
      executor as unknown as RuntimeExecutor,
    );
    runSpy = jest.spyOn(agentRuntime, 'run');

    memoryRepository = new InMemoryMemoryRepository();
    const memoryStore = new MemoryStoreService(memoryRepository);

    messageRepository = new InMemoryMessageRepository();
    const messageStore = new MessageStoreService(messageRepository);
    const router = new MessageRouterService(agentRegistry);
    const handler = new AgentRuntimeMessageHandler(agentRuntime);
    const dispatcher = new MessageDispatcherService(router, messageStore, handler);
    const messageBus = new MessageBusService(messageStore, router, dispatcher);

    coordinator = new CoordinatorService(
      new ExecutionPlanService(),
      new AgentSelectionService(agentRegistry),
      messageBus,
      memoryStore,
    );
  });

  it('runs a two-agent dependency chain end to end through the message bus, handing off data only through shared memory', async () => {
    const result = await coordinator.coordinate({
      plan: {
        planId: 'onboarding-plan',
        agents: [
          { agentId: 'discovery-agent', goal: 'discover learning style', role: 'mandatory' },
          {
            agentId: 'teaching-agent',
            goal: 'teach based on discovery',
            role: 'mandatory',
            dependsOn: ['discovery-agent'],
          },
        ],
        sharedMemoryScopes: [MemoryScope.WORKFLOW],
      },
      context: context(),
      aggregation: 'MERGE',
    });

    expect(result.status).toBe('success');
    expect(result.outcomes.map((o) => o.status)).toEqual(['completed', 'completed']);

    const persisted = await memoryRepository.get({
      scope: MemoryScope.WORKFLOW,
      scopeId: 'onboarding-plan',
      key: 'discovery-agent',
    });
    expect(persisted?.value).toEqual({ discover: { profile: 'visual-learner' } });

    // The teaching agent never receives the discovery agent's IAgentResult
    // directly - it only reaches it by reading shared memory back out, which
    // CoordinatorService does before publishing to the message bus.
    const teachingAgentRequest = runSpy.mock.calls[1][0];
    expect(teachingAgentRequest.input).toEqual({
      dependencyOutputs: { 'discovery-agent': { discover: { profile: 'visual-learner' } } },
    });

    expect(result.aggregatedOutput).toEqual({
      'discovery-agent': { discover: { profile: 'visual-learner' } },
      'teaching-agent': { teach: { confidence: 0.8 } },
    });

    // Every hop through the bus was persisted with a terminal DELIVERED status.
    const messages = await messageRepository.findByTraceId('trace-1');
    expect(messages).toHaveLength(2);
    expect(messages.every((m) => m.status === MessageStatus.DELIVERED)).toBe(true);
  });

  it('stops the coordination and never invokes downstream agents when a mandatory agent fails', async () => {
    executor.executeStep.mockImplementation(async (step, _ctx, state) => {
      if (step.stepId === 'discover') {
        state.failStep(step.stepId, 'discovery blew up');
        throw new Error('discovery blew up');
      }
      state.completeStep(step.stepId, { confidence: 0.8 });
    });

    const result = await coordinator.coordinate({
      plan: {
        planId: 'onboarding-plan',
        agents: [
          { agentId: 'discovery-agent', goal: 'discover learning style', role: 'mandatory' },
          {
            agentId: 'teaching-agent',
            goal: 'teach based on discovery',
            role: 'mandatory',
            dependsOn: ['discovery-agent'],
          },
        ],
        sharedMemoryScopes: [MemoryScope.WORKFLOW],
      },
      context: context(),
      aggregation: 'MERGE',
    });

    expect(result.status).toBe('failure');
    expect(result.outcomes.map((o) => o.status)).toEqual(['failed', 'skipped']);
    expect(executor.executeStep).toHaveBeenCalledTimes(1);
  });

  it('fails the coordination without invoking the runtime when the target agent is not registered', async () => {
    const result = await coordinator.coordinate({
      plan: {
        planId: 'onboarding-plan',
        agents: [{ agentId: 'ghost-agent', goal: 'do something', role: 'mandatory' }],
        sharedMemoryScopes: [MemoryScope.WORKFLOW],
      },
      context: context(),
      aggregation: 'MERGE',
    });

    expect(result.status).toBe('failure');
    expect(result.error).toContain('ghost-agent');
    expect(runSpy).not.toHaveBeenCalled();
  });
});
