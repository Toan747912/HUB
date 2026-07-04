import { AuditLogService } from '../../../../../infrastructure/audit/audit-log.service';
import { BrainContext } from '../../../../../infrastructure/ai-brain/brain-context.types';
import { ContextAssemblyService } from '../../../../../infrastructure/ai-brain/context-assembly.service';
import { ResilientLlmGateway } from '../../../../../infrastructure/ai-brain/resilient-llm-gateway.service';
import { MetricsService } from '../../../../../infrastructure/observability/metrics.service';
import { ExplainabilityRulesService } from '../../../../../shared/services/explainability-rules.service';
import { MISSION_FALLBACK_VERSION } from '../../../domain/engine/mission-planning.engine';
import { MISSION_PROMPT_VERSION } from '../../prompts/mission-prompt';
import { MissionPlannerService } from '../mission-planner.service';

function buildContext(): BrainContext {
  return {
    userId: 'user-1',
    goalId: 'goal-1',
    sessionId: 'session-1',
    traceId: 'trace-1',
    goal: { id: 'goal-1', title: 'Become production-ready' },
    roadmap: { nodeId: 'node-1', status: 'ACTIVE' },
    session: { id: 'session-1', phase: 'ACTIVE' },
    recommendation: { state: 'priority-for-user-1' },
    assembledAt: '2026-07-03T00:00:00.000Z',
  };
}

describe('MissionPlannerService', () => {
  function build() {
    const contextAssembly = { assemble: jest.fn().mockResolvedValue(buildContext()) };
    const llmGateway = { complete: jest.fn() };
    const explainabilityRules = { validate: jest.fn() };
    const metrics = {
      incrementMissionPlanGenerated: jest.fn(),
      incrementMissionPlanFallbackUsed: jest.fn(),
      recordMissionPlanConfidence: jest.fn(),
    };
    const auditLog = { recordSecurityEvent: jest.fn().mockResolvedValue(undefined) };

    const service = new MissionPlannerService(
      contextAssembly as unknown as ContextAssemblyService,
      llmGateway as unknown as ResilientLlmGateway,
      explainabilityRules as unknown as ExplainabilityRulesService,
      metrics as unknown as MetricsService,
      auditLog as unknown as AuditLogService,
    );

    return { service, contextAssembly, llmGateway, explainabilityRules, metrics, auditLog };
  }

  const baseRequest = {
    userId: 'user-1',
    goalId: 'goal-1',
    sessionId: 'session-1',
    traceId: 'trace-1',
  };

  it('reads context exclusively through ContextAssemblyService', async () => {
    const { service, contextAssembly, llmGateway } = build();
    llmGateway.complete.mockResolvedValue({
      raw: { tasks: [{ id: 't1', title: 'T', description: 'D', estimatedMinutes: 10, source: 'roadmap' }], confidence: 0.8, reasoning: 'ok' },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });

    await service.generateTodaysMission(baseRequest);

    expect(contextAssembly.assemble).toHaveBeenCalledWith({
      userId: 'user-1',
      goalId: 'goal-1',
      sessionId: 'session-1',
      traceId: 'trace-1',
    });
  });

  it('returns a normalized LLM-backed mission with confidence, explanation, provider, model, and fallbackUsed=false', async () => {
    const { service, llmGateway } = build();
    llmGateway.complete.mockResolvedValue({
      raw: {
        tasks: [{ id: 't1', title: 'Task', description: 'Do it', estimatedMinutes: 25, source: 'roadmap' }],
        focusSummary: 'Focus on the roadmap',
        confidence: 0.9,
        reasoning: 'Roadmap node is active and highest priority.',
      },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });

    const result = await service.generateTodaysMission(baseRequest);

    expect(result.fallbackUsed).toBe(false);
    expect(result.confidence).toBe(0.9);
    expect(result.explanation).toBe('Roadmap node is active and highest priority.');
    expect(result.provider).toBe('mock-llm');
    expect(result.model).toBe('mock-llm-v1');
    expect(result.promptVersion).toBe(MISSION_PROMPT_VERSION);
    expect(result.tasks).toHaveLength(1);
  });

  it('uses the deterministic fallback engine when the gateway reports fallbackUsed', async () => {
    const { service, llmGateway } = build();
    llmGateway.complete.mockResolvedValue({
      raw: null,
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: true,
      fallbackReason: 'circuit_open',
    });

    const result = await service.generateTodaysMission(baseRequest);

    expect(result.fallbackUsed).toBe(true);
    expect(result.explanation).toContain(MISSION_FALLBACK_VERSION);
    expect(result.explanation).toContain('circuit_open');
    expect(result.tasks.length).toBeGreaterThan(0);
  });

  it('falls back when the LLM returns tasks in an invalid shape', async () => {
    const { service, llmGateway } = build();
    llmGateway.complete.mockResolvedValue({
      raw: { tasks: 'not-an-array', confidence: 0.9, reasoning: 'x' },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });

    const result = await service.generateTodaysMission(baseRequest);

    expect(result.fallbackUsed).toBe(true);
    expect(result.explanation).toContain('invalid_llm_output');
  });

  it('clamps an out-of-range confidence from the LLM into [0,1]', async () => {
    const { service, llmGateway } = build();
    llmGateway.complete.mockResolvedValue({
      raw: {
        tasks: [{ id: 't1', title: 'T', description: 'D', estimatedMinutes: 10, source: 'roadmap' }],
        confidence: 5,
        reasoning: 'x',
      },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });

    const result = await service.generateTodaysMission(baseRequest);
    expect(result.confidence).toBe(1);
  });

  it('validates every response against the shared explainability rules before returning', async () => {
    const { service, llmGateway, explainabilityRules } = build();
    llmGateway.complete.mockResolvedValue({
      raw: { tasks: [{ id: 't1', title: 'T', description: 'D', estimatedMinutes: 10, source: 'roadmap' }], confidence: 0.7, reasoning: 'why' },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });

    await service.generateTodaysMission(baseRequest);

    expect(explainabilityRules.validate).toHaveBeenCalledWith({
      confidence: 0.7,
      reasoning: 'why',
      traced_to: ['goal:goal-1', 'roadmap:node-1', 'session:session-1'],
    });
  });

  it('emits metrics and an audit event on success', async () => {
    const { service, llmGateway, metrics, auditLog } = build();
    llmGateway.complete.mockResolvedValue({
      raw: { tasks: [{ id: 't1', title: 'T', description: 'D', estimatedMinutes: 10, source: 'roadmap' }], confidence: 0.7, reasoning: 'why' },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });

    await service.generateTodaysMission(baseRequest);

    expect(metrics.incrementMissionPlanGenerated).toHaveBeenCalled();
    expect(metrics.recordMissionPlanConfidence).toHaveBeenCalledWith(0.7);
    expect(metrics.incrementMissionPlanFallbackUsed).not.toHaveBeenCalled();
    expect(auditLog.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: 'trace-1',
        userId: 'user-1',
        operation: 'MISSION_PLAN_GENERATED',
      }),
    );
  });

  it('does not throw when metrics and auditLog are omitted (both optional)', async () => {
    const contextAssembly = { assemble: jest.fn().mockResolvedValue(buildContext()) };
    const llmGateway = {
      complete: jest.fn().mockResolvedValue({
        raw: null,
        provider: 'mock-llm',
        model: 'mock-llm-v1',
        fallbackUsed: true,
        fallbackReason: 'circuit_open',
      }),
    };
    const explainabilityRules = { validate: jest.fn() };

    const service = new MissionPlannerService(
      contextAssembly as unknown as ContextAssemblyService,
      llmGateway as unknown as ResilientLlmGateway,
      explainabilityRules as unknown as ExplainabilityRulesService,
    );

    await expect(service.generateTodaysMission(baseRequest)).resolves.toBeDefined();
  });

  it('propagates errors thrown while assembling context', async () => {
    const { service, contextAssembly } = build();
    contextAssembly.assemble.mockRejectedValue(new Error('context assembly failed'));

    await expect(service.generateTodaysMission(baseRequest)).rejects.toThrow(
      'context assembly failed',
    );
  });
});
