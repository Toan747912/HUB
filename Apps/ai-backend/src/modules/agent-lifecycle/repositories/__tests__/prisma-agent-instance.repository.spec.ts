import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../infrastructure/persistence/prisma.service';
import { LifecycleState } from '../../domain/lifecycle-state';
import { AgentInstance } from '../../domain/lifecycle.types';
import { PrismaAgentInstanceRepository } from '../prisma-agent-instance.repository';

function buildInstance(overrides: Partial<AgentInstance> = {}): AgentInstance {
  const now = new Date();
  return {
    instanceId: randomUUID(),
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

describe('PrismaAgentInstanceRepository — integration', () => {
  let prisma: PrismaService;
  let repository: PrismaAgentInstanceRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new PrismaAgentInstanceRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.agentInstance.deleteMany({});
  });

  it('creates a record and reads it back by id', async () => {
    const instance = buildInstance();
    await repository.create(instance);

    const found = await repository.findById(instance.instanceId);
    expect(found).toMatchObject({
      instanceId: instance.instanceId,
      agentId: 'agent-1',
      workflowId: 'workflow-1',
      status: LifecycleState.CREATED,
    });
  });

  it('returns null for an unknown instance id', async () => {
    const found = await repository.findById('missing-instance');
    expect(found).toBeNull();
  });

  it('updates fields in place and returns the merged document', async () => {
    const instance = buildInstance();
    await repository.create(instance);

    const updated = await repository.update(instance.instanceId, {
      status: LifecycleState.RUNNING,
      currentStep: 'step-1',
      startedAt: new Date(),
    });

    expect(updated.status).toBe(LifecycleState.RUNNING);
    expect(updated.currentStep).toBe('step-1');
    expect(updated.startedAt).toBeInstanceOf(Date);

    const count = await prisma.agentInstance.count({ where: { id: instance.instanceId } });
    expect(count).toBe(1);
  });

  it('throws when updating an instance that does not exist', async () => {
    await expect(repository.update('missing-instance', { status: LifecycleState.RUNNING })).rejects.toThrow(
      'Agent instance not found: missing-instance',
    );
  });

  it('findActive returns only non-terminal instances', async () => {
    await repository.create(buildInstance({ status: LifecycleState.CREATED }));
    await repository.create(buildInstance({ status: LifecycleState.RUNNING }));
    await repository.create(buildInstance({ status: LifecycleState.WAITING }));
    await repository.create(buildInstance({ status: LifecycleState.COMPLETED }));
    await repository.create(buildInstance({ status: LifecycleState.FAILED }));
    await repository.create(buildInstance({ status: LifecycleState.STOPPED }));

    const active = await repository.findActive();
    const statuses = active.map((instance) => instance.status).sort();
    expect(statuses).toEqual([LifecycleState.CREATED, LifecycleState.RUNNING, LifecycleState.WAITING].sort());
  });

  it('tracks completed/failed steps as they accumulate', async () => {
    const instance = buildInstance();
    await repository.create(instance);

    await repository.update(instance.instanceId, { completedSteps: ['step-a'] });
    const updated = await repository.update(instance.instanceId, {
      completedSteps: ['step-a', 'step-b'],
      failedSteps: ['step-c'],
    });

    expect(updated.completedSteps).toEqual(['step-a', 'step-b']);
    expect(updated.failedSteps).toEqual(['step-c']);
  });

  it('throws when the underlying Prisma client throws (connection failure handling)', async () => {
    const faultyPrisma = {
      agentInstance: {
        create: () => Promise.reject(new Error('DB_FAULT')),
        update: () => Promise.reject(new Error('DB_FAULT')),
        findUnique: () => Promise.reject(new Error('DB_FAULT')),
        findMany: () => Promise.reject(new Error('DB_FAULT')),
        deleteMany: () => Promise.reject(new Error('DB_FAULT')),
      },
    } as unknown as PrismaService;

    const faultyRepo = new PrismaAgentInstanceRepository(faultyPrisma);
    const instance = buildInstance();

    await expect(faultyRepo.create(instance)).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.findById(instance.instanceId)).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.findActive()).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.deleteTerminalOlderThan(new Date())).rejects.toThrow('DB_FAULT');
  });
});
