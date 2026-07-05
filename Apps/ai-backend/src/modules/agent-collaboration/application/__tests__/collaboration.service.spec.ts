import { IAgentContext } from '../../../agent-core/domain/interfaces';
import { LearningService } from '../../../agent-learning/application/learning.service';
import { MemoryRecord } from '../../../agent-memory/domain/memory-record';
import { MemoryScope } from '../../../agent-memory/domain/memory-scope';
import { MemoryStoreService } from '../../../agent-memory/application/memory-store.service';
import { ReasoningArtifact } from '../../domain/reasoning-result';
import { ReasoningStep } from '../../domain/reasoning-step';
import { CollaborationService } from '../collaboration.service';
import { ConsensusService } from '../consensus.service';
import { ReasoningService, ReasoningStepOutcome } from '../reasoning.service';
import { SynthesisService } from '../synthesis.service';

function context(): IAgentContext {
  return { traceId: 'trace-1', userId: 'user-1', sessionId: 'session-1', metadata: {} };
}

function stepOutcome(overrides: Partial<ReasoningStep> = {}, artifacts: ReasoningArtifact[] = []): ReasoningStepOutcome {
  return {
    step: {
      stepId: 'step-1',
      role: 'Analyst',
      agentId: 'agent-1',
      input: {},
      output: {},
      confidence: 0.8,
      executionTime: 10,
      artifactsProduced: artifacts.map((a) => a.artifactId),
      status: 'completed',
      ...overrides,
    },
    artifacts,
  };
}

describe('CollaborationService', () => {
  let reasoning: jest.Mocked<Pick<ReasoningService, 'runStep'>>;
  let consensus: jest.Mocked<Pick<ConsensusService, 'resolve'>>;
  let synthesis: jest.Mocked<Pick<SynthesisService, 'synthesize'>>;
  let collaboration: CollaborationService;

  beforeEach(() => {
    reasoning = { runStep: jest.fn() };
    consensus = { resolve: jest.fn() };
    synthesis = { synthesize: jest.fn() };

    collaboration = new CollaborationService(
      reasoning as unknown as ReasoningService,
      consensus as unknown as ConsensusService,
      synthesis as unknown as SynthesisService,
    );
  });

  it('runs each requested step, folding a dependsOnRoles output into the next step input', async () => {
    reasoning.runStep
      .mockResolvedValueOnce(stepOutcome({ role: 'Researcher', agentId: 'researcher-1', output: { finding: 'x' } }))
      .mockResolvedValueOnce(stepOutcome({ role: 'Analyst', agentId: 'analyst-1' }));
    consensus.resolve.mockReturnValue({ strategy: 'Majority', outcome: 'resolved', decision: {} });
    synthesis.synthesize.mockReturnValue({
      sessionId: 'session-1',
      summary: 's',
      artifacts: [],
      confidence: 0.8,
      contributors: ['researcher-1', 'analyst-1'],
      consensus: { strategy: 'Majority', outcome: 'resolved' },
      status: 'success',
    });

    await collaboration.collaborate({
      sessionId: 'session-1',
      goal: 'goal',
      steps: [
        { role: 'Researcher', goal: 'research' },
        { role: 'Analyst', goal: 'analyze', dependsOnRoles: ['Researcher'] },
      ],
      context: context(),
    });

    expect(reasoning.runStep).toHaveBeenNthCalledWith(
      2,
      'session-1',
      'Analyst',
      'analyze',
      { dependencyOutputs: { Researcher: { finding: 'x' } } },
      context(),
    );
  });

  it('never rejects: catches a thrown error and returns a failure-tagged ReasoningResult', async () => {
    reasoning.runStep.mockRejectedValue(new Error('role not found'));

    const result = await collaboration.collaborate({
      sessionId: 'session-1',
      goal: 'goal',
      steps: [{ role: 'Ghost', goal: 'do something' }],
      context: context(),
    });

    expect(result.status).toBe('failure');
    expect(result.summary).toContain('role not found');
  });

  it('routes an unresolved consensus through Critic then Reviewer before final synthesis', async () => {
    reasoning.runStep
      .mockResolvedValueOnce(stepOutcome({ role: 'Analyst', agentId: 'analyst-1', output: { decision: 'a' } }))
      .mockResolvedValueOnce(stepOutcome({ role: 'Analyst', agentId: 'analyst-2', output: { decision: 'b' } }))
      .mockResolvedValueOnce(stepOutcome({ role: 'Critic', agentId: 'critic-1', output: { critique: 'x' } }))
      .mockResolvedValueOnce(stepOutcome({ role: 'Reviewer', agentId: 'reviewer-1', output: { decision: 'final' } }));

    consensus.resolve.mockReturnValue({ strategy: 'Majority', outcome: 'unresolved', reason: 'no majority' });
    synthesis.synthesize.mockImplementation((_sessionId, steps) => ({
      sessionId: 'session-1',
      summary: 's',
      artifacts: [],
      confidence: 0.8,
      contributors: steps.map((s) => s.agentId),
      consensus: { strategy: 'Majority', outcome: 'resolved' },
      status: 'success',
    }));

    await collaboration.collaborate({
      sessionId: 'session-1',
      goal: 'goal',
      steps: [
        { role: 'Analyst', goal: 'analyze a' },
        { role: 'Analyst', goal: 'analyze b' },
      ],
      context: context(),
    });

    expect(reasoning.runStep).toHaveBeenCalledTimes(4);
    expect(reasoning.runStep.mock.calls[2][1]).toBe('Critic');
    expect(reasoning.runStep.mock.calls[3][1]).toBe('Reviewer');
    // Reviewer's input carries the Critic's actual output, not a hardcoded value.
    expect((reasoning.runStep.mock.calls[3][3] as { critique: unknown }).critique).toEqual({ critique: 'x' });

    const synthesizedSteps = synthesis.synthesize.mock.calls[0][1];
    expect(synthesizedSteps.map((s) => s.role)).toEqual(['Analyst', 'Analyst', 'Critic', 'Reviewer']);
  });

  it('exposes the persisted session for inspection after collaborate() resolves', async () => {
    reasoning.runStep.mockResolvedValueOnce(stepOutcome());
    consensus.resolve.mockReturnValue({ strategy: 'Majority', outcome: 'resolved', decision: {} });
    synthesis.synthesize.mockReturnValue({
      sessionId: 'session-1',
      summary: 's',
      artifacts: [],
      confidence: 0.8,
      contributors: ['agent-1'],
      consensus: { strategy: 'Majority', outcome: 'resolved' },
      status: 'success',
    });

    await collaboration.collaborate({
      sessionId: 'session-1',
      goal: 'goal',
      steps: [{ role: 'Analyst', goal: 'analyze' }],
      context: context(),
    });

    const session = collaboration.getSession('session-1');
    expect(session?.status).toBe('completed');
    expect(session?.roles).toEqual({ Analyst: 'agent-1' });
  });

  describe('learning wiring', () => {
    function completeOnce() {
      reasoning.runStep.mockResolvedValueOnce(stepOutcome());
      consensus.resolve.mockReturnValue({ strategy: 'Majority', outcome: 'resolved', decision: {} });
      synthesis.synthesize.mockReturnValue({
        sessionId: 'session-1',
        summary: 's',
        artifacts: [],
        confidence: 0.9,
        contributors: ['agent-1'],
        consensus: { strategy: 'Majority', outcome: 'resolved' },
        status: 'success',
      });
    }

    it('hands a completed session to LearningService.runCycle() without changing the returned result', async () => {
      completeOnce();
      const learningService = { runCycle: jest.fn().mockResolvedValue(undefined) };
      const withLearning = new CollaborationService(
        reasoning as unknown as ReasoningService,
        consensus as unknown as ConsensusService,
        synthesis as unknown as SynthesisService,
        undefined,
        undefined,
        undefined,
        undefined,
        learningService as unknown as LearningService,
      );

      const result = await withLearning.collaborate({
        sessionId: 'session-1',
        goal: 'goal',
        steps: [{ role: 'Analyst', goal: 'analyze' }],
        context: context(),
      });

      expect(result.status).toBe('success');
      expect(learningService.runCycle).toHaveBeenCalledWith(
        expect.objectContaining({ workflowId: 'session-1', sourceType: 'collaboration', status: 'success' }),
      );
    });

    it('never fails collaborate() when LearningService.runCycle() rejects', async () => {
      completeOnce();
      const learningService = { runCycle: jest.fn().mockRejectedValue(new Error('learning down')) };
      const withLearning = new CollaborationService(
        reasoning as unknown as ReasoningService,
        consensus as unknown as ConsensusService,
        synthesis as unknown as SynthesisService,
        undefined,
        undefined,
        undefined,
        undefined,
        learningService as unknown as LearningService,
      );

      const result = await withLearning.collaborate({
        sessionId: 'session-1',
        goal: 'goal',
        steps: [{ role: 'Analyst', goal: 'analyze' }],
        context: context(),
      });

      expect(result.status).toBe('success');
      // let the fire-and-forget rejection settle before the test ends
      await new Promise((resolve) => setImmediate(resolve));
    });
  });

  describe('session recovery', () => {
    it('onModuleInit() rehydrates sessions from SESSION-scope memory snapshots', async () => {
      const storedSession = {
        sessionId: 'recovered-session',
        goal: 'goal',
        participants: ['agent-1'],
        roles: { Analyst: 'agent-1' },
        steps: [],
        artifacts: [],
        messages: [],
        status: 'completed',
        startedAt: Date.now(),
      };
      const record: MemoryRecord = {
        id: 'record-1',
        scope: MemoryScope.SESSION,
        scopeId: 'recovered-session',
        key: 'session',
        value: storedSession,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
        version: 1,
        tags: [],
      };
      const memoryStore = { queryByScope: jest.fn().mockResolvedValue([record]) };
      const withMemory = new CollaborationService(
        reasoning as unknown as ReasoningService,
        consensus as unknown as ConsensusService,
        synthesis as unknown as SynthesisService,
        memoryStore as unknown as MemoryStoreService,
      );

      expect(withMemory.getSession('recovered-session')).toBeUndefined();

      await withMemory.onModuleInit();

      expect(memoryStore.queryByScope).toHaveBeenCalledWith(MemoryScope.SESSION);
      expect(withMemory.getSession('recovered-session')).toEqual(storedSession);
    });

    it('onModuleInit() is a no-op with no memory store configured', async () => {
      await expect(collaboration.onModuleInit()).resolves.toBeUndefined();
    });
  });
});
