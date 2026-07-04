import { AuditLogService } from '../../../../../infrastructure/audit/audit-log.service';
import { BrainContext } from '../../../../../infrastructure/ai-brain/brain-context.types';
import { ContextAssemblyService } from '../../../../../infrastructure/ai-brain/context-assembly.service';
import { ResilientLlmGateway } from '../../../../../infrastructure/ai-brain/resilient-llm-gateway.service';
import { MetricsService } from '../../../../../infrastructure/observability/metrics.service';
import { ExplainabilityRulesService } from '../../../../../shared/services/explainability-rules.service';
import { DISCOVERY_FALLBACK_VERSION } from '../../../domain/engine/discovery-planning.engine';
import { DISCOVERY_PROMPT_VERSION } from '../../prompts/discovery-prompt';
import { DiscoveryPlannerService } from '../discovery-planner.service';

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
    discovery: { profile: 'discovery-context-user-1' },
    assembledAt: '2026-07-03T00:00:00.000Z',
  };
}

describe('DiscoveryPlannerService', () => {
  function build() {
    const contextAssembly = { assemble: jest.fn().mockResolvedValue(buildContext()) };
    const llmGateway = { complete: jest.fn() };
    const explainabilityRules = { validate: jest.fn() };
    const metrics = {
      incrementDiscoveryPlanGenerated: jest.fn(),
      incrementDiscoveryPlanFallbackUsed: jest.fn(),
      recordDiscoveryPlanConfidence: jest.fn(),
    };
    const auditLog = { recordSecurityEvent: jest.fn().mockResolvedValue(undefined) };

    const service = new DiscoveryPlannerService(
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
      raw: {
        suggestions: [{ goalArea: 'A', skillFocus: 'a-skill', rationale: 'r' }],
        confidence: 0.8,
        reasoning: 'ok',
      },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });

    await service.discoverInitialFocus(baseRequest);

    expect(contextAssembly.assemble).toHaveBeenCalledWith({
      userId: 'user-1',
      goalId: 'goal-1',
      sessionId: 'session-1',
      traceId: 'trace-1',
    });
  });

  it('returns a normalized LLM-backed discovery plan with confidence, explanation, provider, model, and fallbackUsed=false', async () => {
    const { service, llmGateway } = build();
    llmGateway.complete.mockResolvedValue({
      raw: {
        suggestions: [{ goalArea: 'Backend depth', skillFocus: 'system-design', rationale: 'High signal' }],
        primaryFocus: 'system-design',
        confidence: 0.9,
        reasoning: 'Profile signals system-design interest.',
      },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });

    const result = await service.discoverInitialFocus(baseRequest);

    expect(result.fallbackUsed).toBe(false);
    expect(result.confidence).toBe(0.9);
    expect(result.explanation).toBe('Profile signals system-design interest.');
    expect(result.provider).toBe('mock-llm');
    expect(result.model).toBe('mock-llm-v1');
    expect(result.promptVersion).toBe(DISCOVERY_PROMPT_VERSION);
    expect(result.suggestions).toHaveLength(1);
    expect(result.primaryFocus).toBe('system-design');
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

    const result = await service.discoverInitialFocus(baseRequest);

    expect(result.fallbackUsed).toBe(true);
    expect(result.explanation).toContain(DISCOVERY_FALLBACK_VERSION);
    expect(result.explanation).toContain('circuit_open');
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('falls back when the LLM returns suggestions in an invalid shape', async () => {
    const { service, llmGateway } = build();
    llmGateway.complete.mockResolvedValue({
      raw: { suggestions: 'not-an-array', confidence: 0.9, reasoning: 'x' },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });

    const result = await service.discoverInitialFocus(baseRequest);

    expect(result.fallbackUsed).toBe(true);
    expect(result.explanation).toContain('invalid_llm_output');
  });

  it('clamps an out-of-range confidence from the LLM into [0,1]', async () => {
    const { service, llmGateway } = build();
    llmGateway.complete.mockResolvedValue({
      raw: {
        suggestions: [{ goalArea: 'A', skillFocus: 'a-skill', rationale: 'r' }],
        confidence: 5,
        reasoning: 'x',
      },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });

    const result = await service.discoverInitialFocus(baseRequest);
    expect(result.confidence).toBe(1);
  });

  it('validates every response against the shared explainability rules before returning', async () => {
    const { service, llmGateway, explainabilityRules } = build();
    llmGateway.complete.mockResolvedValue({
      raw: {
        suggestions: [{ goalArea: 'A', skillFocus: 'a-skill', rationale: 'r' }],
        confidence: 0.7,
        reasoning: 'why',
      },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });

    await service.discoverInitialFocus(baseRequest);

    expect(explainabilityRules.validate).toHaveBeenCalledWith({
      confidence: 0.7,
      reasoning: 'why',
      traced_to: ['discovery:user-1', 'goal:goal-1', 'recommendation:priority-for-user-1'],
    });
  });

  it('emits metrics and an audit event on success', async () => {
    const { service, llmGateway, metrics, auditLog } = build();
    llmGateway.complete.mockResolvedValue({
      raw: {
        suggestions: [{ goalArea: 'A', skillFocus: 'a-skill', rationale: 'r' }],
        confidence: 0.7,
        reasoning: 'why',
      },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });

    await service.discoverInitialFocus(baseRequest);

    expect(metrics.incrementDiscoveryPlanGenerated).toHaveBeenCalled();
    expect(metrics.recordDiscoveryPlanConfidence).toHaveBeenCalledWith(0.7);
    expect(metrics.incrementDiscoveryPlanFallbackUsed).not.toHaveBeenCalled();
    expect(auditLog.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: 'trace-1',
        userId: 'user-1',
        operation: 'DISCOVERY_PLAN_GENERATED',
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

    const service = new DiscoveryPlannerService(
      contextAssembly as unknown as ContextAssemblyService,
      llmGateway as unknown as ResilientLlmGateway,
      explainabilityRules as unknown as ExplainabilityRulesService,
    );

    await expect(service.discoverInitialFocus(baseRequest)).resolves.toBeDefined();
  });

  it('propagates errors thrown while assembling context', async () => {
    const { service, contextAssembly } = build();
    contextAssembly.assemble.mockRejectedValue(new Error('context assembly failed'));

    await expect(service.discoverInitialFocus(baseRequest)).rejects.toThrow(
      'context assembly failed',
    );
  });
});
