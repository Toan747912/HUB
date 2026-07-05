import { AgentRegistryService } from '../../agent-runtime/application/agent-registry.service';
import { AgentRuntimeService } from '../../agent-runtime/application/agent-runtime.service';
import { RuntimeContextFactory } from '../../agent-runtime/application/runtime-context.factory';
import { RuntimeExecutor } from '../../agent-runtime/application/runtime-executor';
import { WorkflowRegistryService } from '../../agent-runtime/application/workflow-registry.service';
import { IAgentRequest } from '../../agent-core/domain/interfaces';
import { MemoryAdapterService } from '../../agent-core/infrastructure/memory-adapter.service';
import { PlannerAdapterService } from '../../agent-core/infrastructure/planner-adapter.service';
import { ToolRegistryService } from '../../agent-core/infrastructure/tool-registry.service';
import { VerificationPipelineService } from '../../agent-core/infrastructure/verification-pipeline.service';
import { LifecycleEventsService } from '../application/lifecycle-events.service';
import { LifecycleRegistryService } from '../application/lifecycle-registry.service';
import { LifecycleService } from '../application/lifecycle.service';
import { LifecycleState } from '../domain/lifecycle-state';
import { AgentInstance, ILifecycleRepository } from '../domain/lifecycle.types';

/** Minimal in-memory stand-in for MongoAgentInstanceRepository, sufficient to
 * exercise the full runtime -> lifecycle wiring without a real database. */
class InMemoryLifecycleRepository implements ILifecycleRepository {
  private readonly store = new Map<string, AgentInstance>();

  async create(instance: AgentInstance): Promise<AgentInstance> {
    this.store.set(instance.instanceId, instance);
    return instance;
  }

  async update(instanceId: string, patch: Partial<AgentInstance>): Promise<AgentInstance> {
    const current = this.store.get(instanceId);
    if (!current) throw new Error(`Agent instance not found: ${instanceId}`);
    const updated = { ...current, ...patch, updatedAt: new Date() };
    this.store.set(instanceId, updated);
    return updated;
  }

  async findById(instanceId: string): Promise<AgentInstance | null> {
    return this.store.get(instanceId) ?? null;
  }

  async findActive(): Promise<AgentInstance[]> {
    return [...this.store.values()].filter((instance) =>
      [LifecycleState.CREATED, LifecycleState.READY, LifecycleState.RUNNING, LifecycleState.WAITING].includes(
        instance.status,
      ),
    );
  }

  async deleteTerminalOlderThan(): Promise<number> {
    return 0;
  }
}

function buildRequest(agentId: string): IAgentRequest {
  return {
    requestId: 'req-1',
    agentId,
    goal: 'test goal',
    input: {},
    context: { traceId: 'trace-1', userId: 'user-1', sessionId: 'session-1', metadata: {} },
  };
}

describe('Agent Runtime <-> Lifecycle Manager — integration', () => {
  let repository: InMemoryLifecycleRepository;
  let lifecycleService: LifecycleService;
  let agentRegistry: AgentRegistryService;
  let workflowRegistry: WorkflowRegistryService;
  let executor: jest.Mocked<Pick<RuntimeExecutor, 'executeStep'>>;
  let runtime: AgentRuntimeService;

  function buildRealExecutor(): RuntimeExecutor {
    const plannerAdapter = { execute: jest.fn() } as unknown as PlannerAdapterService;
    const toolRegistry = {
      get: jest.fn().mockReturnValue({
        name: 'echo-tool',
        description: '',
        execute: jest.fn().mockResolvedValue({ ok: true }),
      }),
    } as unknown as ToolRegistryService;
    const memoryAdapter = {} as unknown as MemoryAdapterService;
    const verificationPipeline = {
      verify: jest.fn().mockResolvedValue(true),
    } as unknown as VerificationPipelineService;

    return new RuntimeExecutor(
      plannerAdapter,
      toolRegistry,
      memoryAdapter,
      verificationPipeline,
      undefined,
      undefined,
      undefined,
      lifecycleService,
    );
  }

  beforeEach(() => {
    repository = new InMemoryLifecycleRepository();
    lifecycleService = new LifecycleService(
      new LifecycleRegistryService(repository),
      new LifecycleEventsService(),
    );
    agentRegistry = new AgentRegistryService();
    workflowRegistry = new WorkflowRegistryService();
  });

  it('tracks a full successful run through CREATED -> READY -> RUNNING -> COMPLETED with all steps recorded', async () => {
    agentRegistry.register({ id: 'agent-1', name: 'Agent One', workflowId: 'workflow-1' });
    workflowRegistry.register({
      workflowId: 'workflow-1',
      name: 'Workflow One',
      steps: [
        { stepId: 'step-a', name: 'A', kind: 'tool', target: 'echo-tool' },
        { stepId: 'step-b', name: 'B', kind: 'tool', target: 'echo-tool' },
      ],
    });

    const realExecutor = buildRealExecutor();
    runtime = new AgentRuntimeService(
      agentRegistry,
      workflowRegistry,
      new RuntimeContextFactory(),
      realExecutor,
      undefined,
      undefined,
      lifecycleService,
    );

    const result = await runtime.run(buildRequest('agent-1'));

    expect(result.status).toBe('success');

    const instances = await repository.findActive();
    expect(instances).toHaveLength(0); // no longer active - it completed

    const all = [...(repository as unknown as { store: Map<string, AgentInstance> }).store.values()];
    expect(all).toHaveLength(1);
    const instance = all[0];
    expect(instance.status).toBe(LifecycleState.COMPLETED);
    expect(instance.completedSteps).toEqual(['step-a', 'step-b']);
    expect(instance.failedSteps).toEqual([]);
    expect(instance.currentStep).toBeNull();
    expect(instance.startedAt).toBeInstanceOf(Date);
    expect(instance.endedAt).toBeInstanceOf(Date);
    expect(instance.agentId).toBe('agent-1');
    expect(instance.workflowId).toBe('workflow-1');
  });

  it('tracks a failing run through RUNNING -> FAILED and records the failed step', async () => {
    agentRegistry.register({ id: 'agent-2', name: 'Agent Two', workflowId: 'workflow-2' });
    workflowRegistry.register({
      workflowId: 'workflow-2',
      name: 'Workflow Two',
      steps: [{ stepId: 'step-broken', name: 'Broken', kind: 'tool', target: 'missing-tool' }],
    });

    const plannerAdapter = { execute: jest.fn() } as unknown as PlannerAdapterService;
    const toolRegistry = { get: jest.fn().mockReturnValue(undefined) } as unknown as ToolRegistryService;
    const memoryAdapter = {} as unknown as MemoryAdapterService;
    const verificationPipeline = { verify: jest.fn() } as unknown as VerificationPipelineService;
    const realExecutor = new RuntimeExecutor(
      plannerAdapter,
      toolRegistry,
      memoryAdapter,
      verificationPipeline,
      undefined,
      undefined,
      undefined,
      lifecycleService,
    );

    runtime = new AgentRuntimeService(
      agentRegistry,
      workflowRegistry,
      new RuntimeContextFactory(),
      realExecutor,
      undefined,
      undefined,
      lifecycleService,
    );

    const result = await runtime.run(buildRequest('agent-2'));

    expect(result.status).toBe('failure');

    const all = [...(repository as unknown as { store: Map<string, AgentInstance> }).store.values()];
    expect(all).toHaveLength(1);
    const instance = all[0];
    expect(instance.status).toBe(LifecycleState.FAILED);
    expect(instance.failedSteps).toEqual(['step-broken']);
    expect(instance.lastError).toContain('Tool not registered');
    expect(instance.endedAt).toBeInstanceOf(Date);
  });

  it('recovers active instances across a simulated restart', async () => {
    agentRegistry.register({ id: 'agent-3', name: 'Agent Three', workflowId: 'workflow-3' });
    workflowRegistry.register({
      workflowId: 'workflow-3',
      name: 'Workflow Three',
      steps: [
        { stepId: 'step-a', name: 'A', kind: 'tool', target: 'echo-tool' },
        { stepId: 'step-b', name: 'B', kind: 'tool', target: 'echo-tool' },
      ],
    });

    // Simulate a process that never got to finish the run - stops at the created instance.
    const instance = await lifecycleService.createInstance({
      agentId: 'agent-3',
      workflowId: 'workflow-3',
      traceId: 'trace-restart',
      userId: 'user-1',
      sessionId: 'session-1',
    });
    await lifecycleService.markReady(instance.instanceId);
    await lifecycleService.start(instance.instanceId);

    // A fresh LifecycleService instance (new process) backed by the same durable repository.
    const restartedLifecycleService = new LifecycleService(
      new LifecycleRegistryService(repository),
      new LifecycleEventsService(),
    );

    const recovered = await restartedLifecycleService.onModuleInit().then(() =>
      restartedLifecycleService.recoverActiveInstances(),
    );

    expect(recovered.map((i) => i.instanceId)).toContain(instance.instanceId);

    const rehydrated = await restartedLifecycleService.getInstance(instance.instanceId);
    expect(rehydrated.status).toBe(LifecycleState.RUNNING);

    // The recovered instance can still be legally driven to completion.
    const completed = await restartedLifecycleService.complete(instance.instanceId);
    expect(completed.status).toBe(LifecycleState.COMPLETED);
  });
});
