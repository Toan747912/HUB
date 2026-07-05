import { IAgentContext, IAgentResult } from '../../../agent-core/domain/interfaces';
import { LearningService } from '../../../agent-learning/application/learning.service';
import { MemoryRecord } from '../../../agent-memory/domain/memory-record';
import { MemoryScope } from '../../../agent-memory/domain/memory-scope';
import { MemoryStoreService } from '../../../agent-memory/application/memory-store.service';
import { AgentRegistryService } from '../../../agent-runtime/application/agent-registry.service';
import { MessageBusService } from '../../../agent-message-bus/application/message-bus.service';
import { AgentMessage } from '../../../agent-message-bus/domain/agent-message';
import { MessageEnvelope } from '../../../agent-message-bus/domain/message-envelope';
import { MessagePriority } from '../../../agent-message-bus/domain/message-priority';
import { MessageStatus } from '../../../agent-message-bus/domain/message-status';
import { CoordinationPlanInput, PlannedAgent } from '../../domain/coordination-plan';
import { AgentSelectionService } from '../agent-selection.service';
import { CoordinatorService } from '../coordinator.service';
import { CoordinationRequest } from '../contracts/coordinator.contracts';
import { ExecutionPlanService } from '../execution-plan.service';

function context(): IAgentContext {
  return { traceId: 'trace-1', userId: 'user-1', sessionId: 'session-1', metadata: {} };
}

function successResult(agentId: string, output: Record<string, unknown> = {}): IAgentResult {
  return { requestId: `req-${agentId}`, status: 'success', output, steps: [] };
}

function failureResult(agentId: string, error = `${agentId} exploded`): IAgentResult {
  return { requestId: `req-${agentId}`, status: 'failure', output: {}, steps: [], error };
}

function record(value: unknown): MemoryRecord {
  return {
    id: 'record-1',
    scope: MemoryScope.WORKFLOW,
    scopeId: 'plan-1',
    key: 'agent-a',
    value,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: null,
    version: 1,
    tags: [],
  };
}

/** Builds the DELIVERED AgentMessage the bus would return for a given IAgentResult. */
function delivered(envelope: MessageEnvelope, result: IAgentResult): AgentMessage {
  const now = new Date();
  return {
    messageId: `msg-${result.requestId}`,
    traceId: envelope.traceId,
    workflowId: envelope.workflowId ?? null,
    senderAgentId: envelope.senderAgentId,
    receiverAgentId: envelope.receiverAgentId,
    messageType: envelope.messageType,
    priority: envelope.priority ?? MessagePriority.NORMAL,
    payload: envelope.payload,
    metadata: { response: result },
    createdAt: now,
    updatedAt: now,
    status: MessageStatus.DELIVERED,
    retryCount: 0,
    lastError: null,
  };
}

describe('CoordinatorService', () => {
  let agentRegistry: AgentRegistryService;
  let executionPlan: ExecutionPlanService;
  let agentSelection: AgentSelectionService;
  let messageBus: jest.Mocked<Pick<MessageBusService, 'publish'>>;
  let sharedMemory: jest.Mocked<Pick<MemoryStoreService, 'get' | 'set'>>;
  let service: CoordinatorService;

  /** Convenience: makes messageBus.publish resolve as if the given agent succeeded/failed. */
  function mockPublishOnce(result: IAgentResult): void {
    messageBus.publish.mockImplementationOnce(async (envelope: MessageEnvelope) => delivered(envelope, result));
  }

  beforeEach(() => {
    agentRegistry = new AgentRegistryService();
    agentRegistry.register({ id: 'agent-a', name: 'Agent A', workflowId: 'workflow-a' });
    agentRegistry.register({ id: 'agent-b', name: 'Agent B', workflowId: 'workflow-b' });

    executionPlan = new ExecutionPlanService();
    agentSelection = new AgentSelectionService(agentRegistry);
    messageBus = { publish: jest.fn() };
    sharedMemory = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(record({})) };

    service = new CoordinatorService(
      executionPlan,
      agentSelection,
      messageBus as unknown as MessageBusService,
      sharedMemory as unknown as MemoryStoreService,
    );
  });

  it('publishes a request to the message bus and returns success', async () => {
    mockPublishOnce(successResult('agent-a', { summary: 'done' }));

    const request: CoordinationRequest = {
      plan: {
        planId: 'plan-1',
        agents: [{ agentId: 'agent-a', goal: 'summarize', role: 'mandatory' }],
        sharedMemoryScopes: [MemoryScope.WORKFLOW],
      },
      context: context(),
      aggregation: 'MERGE',
    };

    const result = await service.coordinate(request);

    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    const envelope = messageBus.publish.mock.calls[0][0];
    expect(envelope.receiverAgentId).toBe('agent-a');
    expect((envelope.payload as { agentId: string }).agentId).toBe('agent-a');
    expect(result.status).toBe('success');
    expect(result.outcomes).toEqual([
      { agentId: 'agent-a', role: 'mandatory', status: 'completed', result: successResult('agent-a', { summary: 'done' }) },
    ]);
    expect(result.participatingAgents).toEqual(['agent-a']);
    expect(result.completedAgents).toEqual(['agent-a']);
    expect(result.failedAgents).toEqual([]);
    expect(result.mergedOutput).toEqual(result.aggregatedOutput);
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });

  it('defaults to the Sequential execution policy and rejects an unimplemented one with a failure result', async () => {
    messageBus.publish.mockImplementation(async (envelope: MessageEnvelope) =>
      delivered(envelope, successResult('agent-a', { summary: 'done' })),
    );

    const base: CoordinationRequest = {
      plan: {
        planId: 'plan-1',
        agents: [{ agentId: 'agent-a', goal: 'summarize', role: 'mandatory' }],
        sharedMemoryScopes: [MemoryScope.WORKFLOW],
      },
      context: context(),
      aggregation: 'MERGE',
    };

    const sequentialResult = await service.coordinate(base);
    expect(sequentialResult.status).toBe('success');

    const parallelResult = await service.coordinate({
      ...base,
      plan: { ...base.plan, executionPolicy: 'Parallel' },
    });
    expect(parallelResult.status).toBe('failure');
    expect(parallelResult.error).toContain('Parallel');
  });

  it('stops coordination when a mandatory agent fails, skipping downstream agents', async () => {
    mockPublishOnce(failureResult('agent-a'));

    const request: CoordinationRequest = {
      plan: {
        planId: 'plan-1',
        agents: [
          { agentId: 'agent-a', goal: 'do work', role: 'mandatory' },
          { agentId: 'agent-b', goal: 'do more work', role: 'mandatory', dependsOn: ['agent-a'] },
        ],
        sharedMemoryScopes: [MemoryScope.WORKFLOW],
      },
      context: context(),
      aggregation: 'MERGE',
    };

    const result = await service.coordinate(request);

    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('failure');
    expect(result.error).toBe('agent-a exploded');
    expect(result.outcomes).toEqual([
      { agentId: 'agent-a', role: 'mandatory', status: 'failed', result: failureResult('agent-a'), error: 'agent-a exploded' },
      { agentId: 'agent-b', role: 'mandatory', status: 'skipped' },
    ]);
  });

  it('continues coordination when an optional agent fails', async () => {
    mockPublishOnce(failureResult('agent-a'));
    mockPublishOnce(successResult('agent-b', { ok: true }));

    const request: CoordinationRequest = {
      plan: {
        planId: 'plan-1',
        agents: [
          { agentId: 'agent-a', goal: 'do work', role: 'optional' },
          { agentId: 'agent-b', goal: 'do more work', role: 'mandatory' },
        ],
        sharedMemoryScopes: [MemoryScope.WORKFLOW],
      },
      context: context(),
      aggregation: 'MERGE',
    };

    const result = await service.coordinate(request);

    expect(messageBus.publish).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('partial');
    expect(result.outcomes.map((o) => o.status)).toEqual(['failed', 'completed']);
  });

  it('persists a successful agent output to the plan shared memory scope, keyed by agentId', async () => {
    mockPublishOnce(successResult('agent-a', { summary: 'done' }));

    const request: CoordinationRequest = {
      plan: {
        planId: 'plan-1',
        agents: [{ agentId: 'agent-a', goal: 'summarize', role: 'mandatory' }],
        sharedMemoryScopes: [MemoryScope.WORKFLOW],
      },
      context: context(),
      aggregation: 'MERGE',
    };

    await service.coordinate(request);

    expect(sharedMemory.set).toHaveBeenCalledWith(
      { scope: MemoryScope.WORKFLOW, scopeId: 'plan-1', key: 'agent-a', value: { summary: 'done' } },
      { traceId: 'trace-1', userId: 'user-1' },
    );
  });

  it('reads a dependency output back out of shared memory rather than passing it directly', async () => {
    sharedMemory.get.mockResolvedValue(record({ summary: 'from agent-a' }));
    messageBus.publish.mockImplementation(async (envelope: MessageEnvelope) =>
      delivered(envelope, successResult('agent-b', {})),
    );

    const request: CoordinationRequest = {
      plan: {
        planId: 'plan-1',
        agents: [
          { agentId: 'agent-a', goal: 'do work', role: 'mandatory' },
          { agentId: 'agent-b', goal: 'do more work', role: 'mandatory', dependsOn: ['agent-a'] },
        ],
        sharedMemoryScopes: [MemoryScope.WORKFLOW],
      },
      context: context(),
      aggregation: 'MERGE',
    };

    await service.coordinate(request);

    expect(sharedMemory.get).toHaveBeenCalledWith(
      { scope: MemoryScope.WORKFLOW, scopeId: 'plan-1', key: 'agent-a' },
      { traceId: 'trace-1', userId: 'user-1' },
    );

    const agentBEnvelope = messageBus.publish.mock.calls[1][0];
    expect(agentBEnvelope.payload).toEqual(
      expect.objectContaining({ input: { dependencyOutputs: { 'agent-a': { summary: 'from agent-a' } } } }),
    );
  });

  it('does not touch shared memory at all when it is not provided (optional dependency)', async () => {
    const bareService = new CoordinatorService(
      executionPlan,
      agentSelection,
      messageBus as unknown as MessageBusService,
    );
    mockPublishOnce(successResult('agent-a', { summary: 'done' }));

    const request: CoordinationRequest = {
      plan: {
        planId: 'plan-1',
        agents: [{ agentId: 'agent-a', goal: 'summarize', role: 'mandatory' }],
        sharedMemoryScopes: [MemoryScope.WORKFLOW],
      },
      context: context(),
      aggregation: 'MERGE',
    };

    const result = await bareService.coordinate(request);

    expect(result.status).toBe('success');
    expect(sharedMemory.set).not.toHaveBeenCalled();
  });

  it('returns a failure CoordinationResult without throwing when plan resolution fails', async () => {
    const request: CoordinationRequest = {
      plan: {
        planId: 'plan-1',
        agents: [{ agentId: 'agent-a', goal: 'do work', role: 'mandatory', dependsOn: ['ghost'] }],
        sharedMemoryScopes: [MemoryScope.WORKFLOW],
      },
      context: context(),
      aggregation: 'MERGE',
    };

    const result = await service.coordinate(request);

    expect(result.status).toBe('failure');
    expect(result.outcomes).toEqual([]);
    expect(result.error).toContain('ghost');
    expect(messageBus.publish).not.toHaveBeenCalled();
  });

  it('treats a non-DELIVERED message bus outcome as a synthetic failure result', async () => {
    messageBus.publish.mockImplementationOnce(async (envelope: MessageEnvelope) => ({
      messageId: 'msg-dead',
      traceId: envelope.traceId,
      workflowId: envelope.workflowId ?? null,
      senderAgentId: envelope.senderAgentId,
      receiverAgentId: envelope.receiverAgentId,
      messageType: envelope.messageType,
      priority: envelope.priority ?? MessagePriority.NORMAL,
      payload: envelope.payload,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      status: MessageStatus.DEAD_LETTER,
      retryCount: 4,
      lastError: 'UNKNOWN_RECEIVER: agent-a',
    }));

    const request: CoordinationRequest = {
      plan: {
        planId: 'plan-1',
        agents: [{ agentId: 'agent-a', goal: 'summarize', role: 'mandatory' }],
        sharedMemoryScopes: [MemoryScope.WORKFLOW],
      },
      context: context(),
      aggregation: 'MERGE',
    };

    const result = await service.coordinate(request);

    expect(result.status).toBe('failure');
    expect(result.error).toBe('UNKNOWN_RECEIVER: agent-a');
  });

  describe('aggregation strategies', () => {
    function twoAgentPlan(): CoordinationPlanInput {
      return {
        planId: 'plan-1',
        agents: [
          { agentId: 'agent-a', goal: 'do work', role: 'optional' },
          { agentId: 'agent-b', goal: 'do more work', role: 'mandatory' },
        ],
        sharedMemoryScopes: [MemoryScope.WORKFLOW],
      };
    }

    it('MERGE combines every completed agent output keyed by agentId', async () => {
      mockPublishOnce(successResult('agent-a', { confidence: 0.4 }));
      mockPublishOnce(successResult('agent-b', { confidence: 0.9 }));

      const result = await service.coordinate({ plan: twoAgentPlan(), context: context(), aggregation: 'MERGE' });

      expect(result.aggregatedOutput).toEqual({
        'agent-a': { confidence: 0.4 },
        'agent-b': { confidence: 0.9 },
      });
    });

    it('FIRST_SUCCESS returns only the first completed agent output', async () => {
      mockPublishOnce(successResult('agent-a', { confidence: 0.4 }));
      mockPublishOnce(successResult('agent-b', { confidence: 0.9 }));

      const result = await service.coordinate({
        plan: twoAgentPlan(),
        context: context(),
        aggregation: 'FIRST_SUCCESS',
      });

      expect(result.aggregatedOutput).toEqual({ confidence: 0.4 });
    });

    it('ALL_SUCCESS returns empty output when any agent did not complete', async () => {
      mockPublishOnce(failureResult('agent-a'));
      mockPublishOnce(successResult('agent-b', { confidence: 0.9 }));

      const result = await service.coordinate({
        plan: twoAgentPlan(),
        context: context(),
        aggregation: 'ALL_SUCCESS',
      });

      expect(result.aggregatedOutput).toEqual({});
    });

    it('BEST_CONFIDENCE returns only the completed output with the highest confidence', async () => {
      mockPublishOnce(successResult('agent-a', { confidence: 0.4 }));
      mockPublishOnce(successResult('agent-b', { confidence: 0.9 }));

      const result = await service.coordinate({
        plan: twoAgentPlan(),
        context: context(),
        aggregation: 'BEST_CONFIDENCE',
      });

      expect(result.aggregatedOutput).toEqual({ 'agent-b': { confidence: 0.9 } });
    });
  });

  describe('learning wiring', () => {
    it('hands a completed plan to LearningService.runCycle() without changing the returned result', async () => {
      const learningService = { runCycle: jest.fn().mockResolvedValue(undefined) };
      const withLearning = new CoordinatorService(
        executionPlan,
        agentSelection,
        messageBus as unknown as MessageBusService,
        sharedMemory as unknown as MemoryStoreService,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        learningService as unknown as LearningService,
      );
      mockPublishOnce(successResult('agent-a', { summary: 'done' }));

      const request: CoordinationRequest = {
        plan: {
          planId: 'plan-1',
          agents: [{ agentId: 'agent-a', goal: 'summarize', role: 'mandatory' }],
          sharedMemoryScopes: [MemoryScope.WORKFLOW],
        },
        context: context(),
        aggregation: 'MERGE',
      };

      const result = await withLearning.coordinate(request);

      expect(result.status).toBe('success');
      expect(learningService.runCycle).toHaveBeenCalledWith(
        expect.objectContaining({ workflowId: 'plan-1', sourceType: 'coordination', status: 'success' }),
      );
    });

    it('never fails coordinate() when LearningService.runCycle() rejects', async () => {
      const learningService = { runCycle: jest.fn().mockRejectedValue(new Error('learning down')) };
      const withLearning = new CoordinatorService(
        executionPlan,
        agentSelection,
        messageBus as unknown as MessageBusService,
        sharedMemory as unknown as MemoryStoreService,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        learningService as unknown as LearningService,
      );
      mockPublishOnce(successResult('agent-a', { summary: 'done' }));

      const request: CoordinationRequest = {
        plan: {
          planId: 'plan-1',
          agents: [{ agentId: 'agent-a', goal: 'summarize', role: 'mandatory' }],
          sharedMemoryScopes: [MemoryScope.WORKFLOW],
        },
        context: context(),
        aggregation: 'MERGE',
      };

      const result = await withLearning.coordinate(request);

      expect(result.status).toBe('success');
      await new Promise((resolve) => setImmediate(resolve));
    });
  });
});
