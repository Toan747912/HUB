import { AuditLogService } from '../../../../../infrastructure/audit/audit-log.service';
import { BrainContext } from '../../../../../infrastructure/ai-brain/brain-context.types';
import { ContextAssemblyService } from '../../../../../infrastructure/ai-brain/context-assembly.service';
import { ResilientLlmGateway } from '../../../../../infrastructure/ai-brain/resilient-llm-gateway.service';
import { MetricsService } from '../../../../../infrastructure/observability/metrics.service';
import { ExplainabilityRulesService } from '../../../../../shared/services/explainability-rules.service';
import { EVIDENCE_FALLBACK_VERSION } from '../../../domain/engine/evidence-planning.engine';
import { EVIDENCE_PROMPT_VERSION } from '../../prompts/evidence-prompt';
import { EvidencePlannerService } from '../evidence-planner.service';

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
    assessment: { refs: ['assessment-session-1-1'] },
    assembledAt: '2026-07-03T00:00:00.000Z',
  };
}

describe('EvidencePlannerService', () => {
  function build() {
    const contextAssembly = { assemble: jest.fn().mockResolvedValue(buildContext()) };
    const llmGateway = { complete: jest.fn() };
    const explainabilityRules = { validate: jest.fn() };
    const metrics = {
      incrementEvidencePlanGenerated: jest.fn(),
      incrementEvidencePlanFallbackUsed: jest.fn(),
      recordEvidencePlanConfidence: jest.fn(),
    };
    const auditLog = { recordSecurityEvent: jest.fn().mockResolvedValue(undefined) };

    const service = new EvidencePlannerService(
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
        requirements: [{ evidenceType: 'a', description: 'd', rationale: 'r' }],
        confidence: 0.8,
        reasoning: 'ok',
      },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });

    await service.planEvidence(baseRequest);

    expect(contextAssembly.assemble).toHaveBeenCalledWith({
      userId: 'user-1',
      goalId: 'goal-1',
      sessionId: 'session-1',
      traceId: 'trace-1',
    });
  });

  it('returns a normalized LLM-backed evidence plan with confidence, explanation, provider, model, and fallbackUsed=false', async () => {
    const { service, llmGateway } = build();
    llmGateway.complete.mockResolvedValue({
      raw: {
        requirements: [
          { evidenceType: 'project-submission', description: 'Submit project', rationale: 'High signal' },
        ],
        primaryRequirement: 'project-submission',
        confidence: 0.9,
        reasoning: 'Assessment history signals a verification gap.',
      },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });

    const result = await service.planEvidence(baseRequest);

    expect(result.fallbackUsed).toBe(false);
    expect(result.confidence).toBe(0.9);
    expect(result.explanation).toBe('Assessment history signals a verification gap.');
    expect(result.provider).toBe('mock-llm');
    expect(result.model).toBe('mock-llm-v1');
    expect(result.promptVersion).toBe(EVIDENCE_PROMPT_VERSION);
    expect(result.requirements).toHaveLength(1);
    expect(result.primaryRequirement).toBe('project-submission');
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

    const result = await service.planEvidence(baseRequest);

    expect(result.fallbackUsed).toBe(true);
    expect(result.explanation).toContain(EVIDENCE_FALLBACK_VERSION);
    expect(result.explanation).toContain('circuit_open');
    expect(result.requirements.length).toBeGreaterThan(0);
  });

  it('falls back when the LLM returns requirements in an invalid shape', async () => {
    const { service, llmGateway } = build();
    llmGateway.complete.mockResolvedValue({
      raw: { requirements: 'not-an-array', confidence: 0.9, reasoning: 'x' },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });

    const result = await service.planEvidence(baseRequest);

    expect(result.fallbackUsed).toBe(true);
    expect(result.explanation).toContain('invalid_llm_output');
  });

  it('clamps an out-of-range confidence from the LLM into [0,1]', async () => {
    const { service, llmGateway } = build();
    llmGateway.complete.mockResolvedValue({
      raw: {
        requirements: [{ evidenceType: 'a', description: 'd', rationale: 'r' }],
        confidence: 5,
        reasoning: 'x',
      },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });

    const result = await service.planEvidence(baseRequest);
    expect(result.confidence).toBe(1);
  });

  it('validates every response against the shared explainability rules before returning', async () => {
    const { service, llmGateway, explainabilityRules } = build();
    llmGateway.complete.mockResolvedValue({
      raw: {
        requirements: [{ evidenceType: 'a', description: 'd', rationale: 'r' }],
        confidence: 0.7,
        reasoning: 'why',
      },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });

    await service.planEvidence(baseRequest);

    expect(explainabilityRules.validate).toHaveBeenCalledWith({
      confidence: 0.7,
      reasoning: 'why',
      traced_to: [
        'goal:goal-1',
        'roadmap:node-1',
        'recommendation:priority-for-user-1',
        'discovery:user-1',
      ],
    });
  });

  it('emits metrics and an audit event on success', async () => {
    const { service, llmGateway, metrics, auditLog } = build();
    llmGateway.complete.mockResolvedValue({
      raw: {
        requirements: [{ evidenceType: 'a', description: 'd', rationale: 'r' }],
        confidence: 0.7,
        reasoning: 'why',
      },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });

    await service.planEvidence(baseRequest);

    expect(metrics.incrementEvidencePlanGenerated).toHaveBeenCalled();
    expect(metrics.recordEvidencePlanConfidence).toHaveBeenCalledWith(0.7);
    expect(metrics.incrementEvidencePlanFallbackUsed).not.toHaveBeenCalled();
    expect(auditLog.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: 'trace-1',
        userId: 'user-1',
        operation: 'EVIDENCE_PLAN_GENERATED',
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

    const service = new EvidencePlannerService(
      contextAssembly as unknown as ContextAssemblyService,
      llmGateway as unknown as ResilientLlmGateway,
      explainabilityRules as unknown as ExplainabilityRulesService,
    );

    await expect(service.planEvidence(baseRequest)).resolves.toBeDefined();
  });

  it('propagates errors thrown while assembling context', async () => {
    const { service, contextAssembly } = build();
    contextAssembly.assemble.mockRejectedValue(new Error('context assembly failed'));

    await expect(service.planEvidence(baseRequest)).rejects.toThrow('context assembly failed');
  });

  it('propagates circuit-breaker fallback (no throw) when the gateway reports circuit_open', async () => {
    const { service, llmGateway } = build();
    llmGateway.complete.mockResolvedValue({
      raw: null,
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: true,
      fallbackReason: 'circuit_open',
    });

    const result = await service.planEvidence(baseRequest);

    expect(result.fallbackUsed).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
