import { LifecycleState } from '../../domain/lifecycle-state';
import { LifecycleTransitionError } from '../../domain/lifecycle-transition';
import { AgentInstance, LifecycleEventType } from '../../domain/lifecycle.types';
import { LifecycleEventsService } from '../lifecycle-events.service';
import { LifecycleRegistryService } from '../lifecycle-registry.service';
import { LifecycleService } from '../lifecycle.service';

function buildInstance(overrides: Partial<AgentInstance> = {}): AgentInstance {
  const now = new Date();
  return {
    instanceId: 'instance-1',
    agentId: 'agent-1',
    workflowId: 'workflow-1',
    status: LifecycleState.CREATED,
    startedAt: null,
    endedAt: null,
    currentStep: null,
    completedSteps: [],
    failedSteps: [],
    traceId: 'trace-1',
    userId: 'user-1',
    sessionId: 'session-1',
    lastError: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('LifecycleService', () => {
  let registry: jest.Mocked<Pick<LifecycleRegistryService, 'create' | 'transition' | 'patch' | 'get' | 'recoverAll'>>;
  let events: jest.Mocked<Pick<LifecycleEventsService, 'emit'>>;
  let service: LifecycleService;

  beforeEach(() => {
    registry = {
      create: jest.fn(),
      transition: jest.fn(),
      patch: jest.fn(),
      get: jest.fn(),
      recoverAll: jest.fn(),
    };
    events = { emit: jest.fn() };

    service = new LifecycleService(
      registry as unknown as LifecycleRegistryService,
      events as unknown as LifecycleEventsService,
    );
  });

  it('createInstance persists a CREATED instance and emits AGENT_CREATED', async () => {
    const created = buildInstance();
    registry.create.mockResolvedValue(created);

    const result = await service.createInstance({
      agentId: 'agent-1',
      workflowId: 'workflow-1',
      traceId: 'trace-1',
      userId: 'user-1',
      sessionId: 'session-1',
    });

    expect(registry.create).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: 'agent-1', workflowId: 'workflow-1', status: LifecycleState.CREATED }),
    );
    expect(events.emit).toHaveBeenCalledWith(LifecycleEventType.AGENT_CREATED, created);
    expect(result).toBe(created);
  });

  it('runs the happy path: created -> ready -> running -> step events -> completed', async () => {
    const created = buildInstance();
    registry.create.mockResolvedValue(created);
    registry.transition.mockImplementation(async (_id, to, patch) =>
      buildInstance({ status: to, ...patch }),
    );
    registry.patch.mockImplementation(async (_id, patch) => buildInstance({ ...patch }));
    registry.get.mockResolvedValue(buildInstance({ status: LifecycleState.RUNNING, completedSteps: [] }));

    await service.createInstance({ agentId: 'agent-1', workflowId: 'workflow-1', traceId: 'trace-1' });
    await service.markReady('instance-1');
    await service.start('instance-1');
    await service.notifyStepStarted('instance-1', 'step-a');
    await service.notifyStepCompleted('instance-1', 'step-a');
    const completed = await service.complete('instance-1');

    expect(registry.transition).toHaveBeenNthCalledWith(1, 'instance-1', LifecycleState.READY);
    expect(registry.transition).toHaveBeenNthCalledWith(
      2,
      'instance-1',
      LifecycleState.RUNNING,
      expect.objectContaining({ startedAt: expect.any(Date) }),
    );
    expect(registry.transition).toHaveBeenNthCalledWith(
      3,
      'instance-1',
      LifecycleState.COMPLETED,
      expect.objectContaining({ endedAt: expect.any(Date) }),
    );
    expect(completed.status).toBe(LifecycleState.COMPLETED);
    expect(events.emit).toHaveBeenCalledWith(LifecycleEventType.STEP_STARTED, expect.anything(), {
      stepId: 'step-a',
    });
    expect(events.emit).toHaveBeenCalledWith(LifecycleEventType.STEP_COMPLETED, expect.anything(), {
      stepId: 'step-a',
    });
    expect(events.emit).toHaveBeenCalledWith(LifecycleEventType.AGENT_COMPLETED, expect.anything());
  });

  it('fail() records the error, transitions to FAILED, and emits AGENT_FAILED', async () => {
    registry.transition.mockResolvedValue(
      buildInstance({ status: LifecycleState.FAILED, lastError: 'boom' }),
    );

    const failed = await service.fail('instance-1', 'boom');

    expect(registry.transition).toHaveBeenCalledWith(
      'instance-1',
      LifecycleState.FAILED,
      expect.objectContaining({ lastError: 'boom', endedAt: expect.any(Date) }),
    );
    expect(failed.status).toBe(LifecycleState.FAILED);
    expect(events.emit).toHaveBeenCalledWith(LifecycleEventType.AGENT_FAILED, failed, { error: 'boom' });
  });

  it('notifyStepFailed appends to failedSteps and emits STEP_FAILED without changing overall status', async () => {
    registry.get.mockResolvedValue(buildInstance({ status: LifecycleState.RUNNING, failedSteps: [] }));
    registry.patch.mockResolvedValue(
      buildInstance({ status: LifecycleState.RUNNING, failedSteps: ['step-b'], lastError: 'tool broke' }),
    );

    const updated = await service.notifyStepFailed('instance-1', 'step-b', 'tool broke');

    expect(registry.patch).toHaveBeenCalledWith('instance-1', {
      failedSteps: ['step-b'],
      currentStep: null,
      lastError: 'tool broke',
    });
    expect(updated.status).toBe(LifecycleState.RUNNING);
    expect(events.emit).toHaveBeenCalledWith(LifecycleEventType.STEP_FAILED, updated, {
      stepId: 'step-b',
      error: 'tool broke',
    });
  });

  it('propagates LifecycleTransitionError from an invalid transition without swallowing it', async () => {
    registry.transition.mockRejectedValue(
      new LifecycleTransitionError('instance-1', LifecycleState.COMPLETED, LifecycleState.RUNNING),
    );

    await expect(service.resume('instance-1')).rejects.toBeInstanceOf(LifecycleTransitionError);
  });

  it('recoverActiveInstances delegates to the registry (restart recovery)', async () => {
    const active = [buildInstance({ status: LifecycleState.RUNNING })];
    registry.recoverAll.mockResolvedValue(active);

    const recovered = await service.recoverActiveInstances();

    expect(registry.recoverAll).toHaveBeenCalled();
    expect(recovered).toBe(active);
  });

  it('onModuleInit recovers active instances on startup', async () => {
    registry.recoverAll.mockResolvedValue([buildInstance({ status: LifecycleState.WAITING })]);

    await service.onModuleInit();

    expect(registry.recoverAll).toHaveBeenCalled();
  });
});
