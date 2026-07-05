import { LifecycleState } from '../../domain/lifecycle-state';
import { LifecycleTransitionError } from '../../domain/lifecycle-transition';
import { AgentInstance, ILifecycleRepository } from '../../domain/lifecycle.types';
import { LifecycleRegistryService } from '../lifecycle-registry.service';

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

describe('LifecycleRegistryService', () => {
  let repository: jest.Mocked<ILifecycleRepository>;
  let registry: LifecycleRegistryService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findActive: jest.fn(),
      deleteTerminalOlderThan: jest.fn(),
    };
    registry = new LifecycleRegistryService(repository);
  });

  it('create() persists via the repository and caches the result', async () => {
    const instance = buildInstance();
    repository.create.mockResolvedValue(instance);

    const result = await registry.create(instance);

    expect(repository.create).toHaveBeenCalledWith(instance);
    expect(result).toBe(instance);
    await expect(registry.get('instance-1')).resolves.toBe(instance);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('transition() validates the state machine before persisting', async () => {
    const instance = buildInstance({ status: LifecycleState.CREATED });
    repository.create.mockResolvedValue(instance);
    await registry.create(instance);

    repository.update.mockResolvedValue(buildInstance({ status: LifecycleState.READY }));
    const updated = await registry.transition('instance-1', LifecycleState.READY);

    expect(repository.update).toHaveBeenCalledWith('instance-1', { status: LifecycleState.READY });
    expect(updated.status).toBe(LifecycleState.READY);
  });

  it('transition() rejects an invalid move and never calls the repository', async () => {
    const instance = buildInstance({ status: LifecycleState.COMPLETED });
    repository.create.mockResolvedValue(instance);
    await registry.create(instance);

    await expect(registry.transition('instance-1', LifecycleState.RUNNING)).rejects.toBeInstanceOf(
      LifecycleTransitionError,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('hydrates from the repository on cache miss', async () => {
    const instance = buildInstance({ instanceId: 'instance-2' });
    repository.findById.mockResolvedValue(instance);

    const result = await registry.get('instance-2');

    expect(repository.findById).toHaveBeenCalledWith('instance-2');
    expect(result).toBe(instance);
  });

  it('throws when an instance cannot be found anywhere', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(registry.get('missing')).rejects.toThrow('Agent instance not found: missing');
  });

  it('recoverAll loads active instances into the cache', async () => {
    const active = [buildInstance({ instanceId: 'a', status: LifecycleState.RUNNING })];
    repository.findActive.mockResolvedValue(active);

    const recovered = await registry.recoverAll();

    expect(recovered).toBe(active);
    repository.findById.mockClear();
    await expect(registry.get('a')).resolves.toEqual(active[0]);
    expect(repository.findById).not.toHaveBeenCalled();
  });
});
