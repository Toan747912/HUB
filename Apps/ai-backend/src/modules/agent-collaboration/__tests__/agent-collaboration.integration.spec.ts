import { IAgentContext } from '../../agent-core/domain/interfaces';
import { AgentSelectionService } from '../../agent-coordinator/application/agent-selection.service';
import { CoordinatorService } from '../../agent-coordinator/application/coordinator.service';
import { ExecutionPlanService } from '../../agent-coordinator/application/execution-plan.service';
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
import { CollaborationService } from '../application/collaboration.service';
import { ConsensusService } from '../application/consensus.service';
import { ReasoningService } from '../application/reasoning.service';
import { RoleResolverService } from '../application/role-resolver.service';
import { SynthesisService } from '../application/synthesis.service';

/** In-memory stand-in for the Mongo-backed memory repository (real MemoryStoreService on top). */
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

/** In-memory stand-in for the Mongo-backed message repository (real MessageBusService on top). */
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

describe('agent-collaboration integration (Coordinator -> RoleResolver -> Runtime -> Planner -> Consensus -> Final Answer)', () => {
  let collaboration: CollaborationService;
  let roleResolver: RoleResolverService;
  let executor: jest.Mocked<Pick<RuntimeExecutor, 'executeStep'>>;

  beforeEach(() => {
    const agentRegistry = new AgentRegistryService();
    agentRegistry.register({ id: 'researcher-agent', name: 'Researcher Agent', workflowId: 'researcher-workflow' });
    agentRegistry.register({ id: 'analyst-agent', name: 'Analyst Agent', workflowId: 'analyst-workflow' });
    agentRegistry.register({ id: 'critic-agent', name: 'Critic Agent', workflowId: 'critic-workflow' });
    agentRegistry.register({ id: 'reviewer-agent', name: 'Reviewer Agent', workflowId: 'reviewer-workflow' });

    const workflowRegistry = new WorkflowRegistryService();
    const researcherSteps: RuntimeStepDefinition[] = [
      { stepId: 'research', name: 'Research', kind: 'planner', target: 'discovery_planner' },
    ];
    const analystSteps: RuntimeStepDefinition[] = [
      { stepId: 'analyze', name: 'Analyze', kind: 'planner', target: 'discovery_planner' },
    ];
    const criticSteps: RuntimeStepDefinition[] = [
      { stepId: 'critique', name: 'Critique', kind: 'planner', target: 'discovery_planner' },
    ];
    const reviewerSteps: RuntimeStepDefinition[] = [
      { stepId: 'review', name: 'Review', kind: 'planner', target: 'discovery_planner' },
    ];
    workflowRegistry.register({ workflowId: 'researcher-workflow', name: 'Researcher', steps: researcherSteps });
    workflowRegistry.register({ workflowId: 'analyst-workflow', name: 'Analyst', steps: analystSteps });
    workflowRegistry.register({ workflowId: 'critic-workflow', name: 'Critic', steps: criticSteps });
    workflowRegistry.register({ workflowId: 'reviewer-workflow', name: 'Reviewer', steps: reviewerSteps });

    executor = { executeStep: jest.fn() };
    executor.executeStep.mockImplementation(async (step, _ctx, state) => {
      if (step.stepId === 'research') {
        state.completeStep(step.stepId, {
          confidence: 0.9,
          artifacts: [{ type: 'research_notes', content: { finding: 'signal detected' } }],
        });
        return;
      }
      if (step.stepId === 'analyze') {
        state.completeStep(step.stepId, { confidence: 0.85, decision: 'approve' });
        return;
      }
      if (step.stepId === 'critique') {
        state.completeStep(step.stepId, { confidence: 0.8, critique: 'the analysis is sound' });
        return;
      }
      state.completeStep(step.stepId, { confidence: 0.95, decision: 'approve' });
    });

    const agentRuntime = new AgentRuntimeService(
      agentRegistry,
      workflowRegistry,
      new RuntimeContextFactory(),
      executor as unknown as RuntimeExecutor,
    );

    const memoryStore = new MemoryStoreService(new InMemoryMemoryRepository());

    const messageRepository = new InMemoryMessageRepository();
    const messageStore = new MessageStoreService(messageRepository);
    const router = new MessageRouterService(agentRegistry);
    const handler = new AgentRuntimeMessageHandler(agentRuntime);
    const dispatcher = new MessageDispatcherService(router, messageStore, handler);
    const messageBus = new MessageBusService(messageStore, router, dispatcher);

    const coordinator = new CoordinatorService(
      new ExecutionPlanService(),
      new AgentSelectionService(agentRegistry),
      messageBus,
      memoryStore,
    );

    roleResolver = new RoleResolverService();
    roleResolver.registerRole('Researcher', 'researcher-agent');
    roleResolver.registerRole('Analyst', 'analyst-agent');
    roleResolver.registerRole('Critic', 'critic-agent');
    roleResolver.registerRole('Reviewer', 'reviewer-agent');

    const reasoning = new ReasoningService(roleResolver, coordinator, memoryStore);
    collaboration = new CollaborationService(reasoning, new ConsensusService(), new SynthesisService(), memoryStore);
  });

  it('resolves semantic roles to agentIds, runs each step through the Coordinator, and synthesizes a final answer', async () => {
    // Researcher and Analyst produce different outputs (as different roles
    // naturally do), so Majority consensus cannot agree on either verbatim -
    // this exercises the full Conflicting outputs -> Consensus (unresolved)
    // -> Critic -> Reviewer -> Final synthesis path end to end.
    const result = await collaboration.collaborate({
      sessionId: 'collab-session-1',
      goal: 'Decide whether to ship the feature',
      steps: [
        { role: 'Researcher', goal: 'research the feature risk' },
        { role: 'Analyst', goal: 'analyze the research', dependsOnRoles: ['Researcher'] },
      ],
      context: context(),
    });

    expect(result.status).toBe('success');
    expect(result.contributors).toEqual([
      'researcher-agent',
      'analyst-agent',
      'critic-agent',
      'reviewer-agent',
    ]);
    expect(result.consensus.outcome).toBe('resolved');
    expect(result.consensus.decision).toEqual({ confidence: 0.95, decision: 'approve' });
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].type).toBe('research_notes');

    const session = collaboration.getSession('collab-session-1');
    expect(session?.roles).toEqual({
      Researcher: 'researcher-agent',
      Analyst: 'analyst-agent',
      Critic: 'critic-agent',
      Reviewer: 'reviewer-agent',
    });
    expect(session?.status).toBe('completed');
    expect(executor.executeStep).toHaveBeenCalledTimes(4);
  });

  it('never hardcodes an agentId: rebinding a role changes which agent a step is dispatched to', async () => {
    roleResolver.unregisterRole('Analyst', 'analyst-agent');
    roleResolver.registerRole('Analyst', 'researcher-agent');

    const result = await collaboration.collaborate({
      sessionId: 'collab-session-2',
      goal: 'goal',
      steps: [{ role: 'Analyst', goal: 'analyze' }],
      context: context(),
    });

    expect(result.contributors).toEqual(['researcher-agent']);
  });

  it('fails the session (never rejects) when a required role has no registered agent', async () => {
    const result = await collaboration.collaborate({
      sessionId: 'collab-session-3',
      goal: 'goal',
      steps: [{ role: 'Summarizer', goal: 'summarize' }],
      context: context(),
    });

    expect(result.status).toBe('failure');
    expect(result.summary).toContain('Summarizer');
  });
});
