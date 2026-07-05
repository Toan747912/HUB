import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import { KNOWLEDGE_FALLBACK_VERSION } from '../domain/engine/knowledge-planning.engine';
import { KnowledgePlannerModule } from '../knowledge-planner.module';
import { KnowledgePlannerService } from '../application/services/knowledge-planner.service';

describe('KnowledgePlannerModule — integration', () => {
  let module: TestingModule;
  let service: KnowledgePlannerService;
  let auditRepository: AuditLogRepository;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        KnowledgePlannerModule,
      ],
    }).compile();

    service = module.get(KnowledgePlannerService);
    auditRepository = module.get(AuditLogRepository);
  });

  afterAll(async () => {
    await module.close();
  });

  it('resolves through the real module graph without reaching a repository directly', () => {
    expect(service).toBeInstanceOf(KnowledgePlannerService);
  });

  it('recommends knowledge end-to-end, falling back deterministically when the mock LLM output does not match the knowledge contract, and records an audit event', async () => {
    const result = await service.recommendKnowledge({
      userId: 'user-1',
      goalId: 'goal-1',
      sessionId: 'session-1',
      traceId: 'trace-integration-1',
    });

    // The shared MockLlmClientService returns a generic explainable payload
    // with no "recommendations" field, so a correctly-wired Knowledge Planner
    // must reject it and fall back to the deterministic engine rather than
    // fabricating recommendations.
    expect(result.fallbackUsed).toBe(true);
    expect(result.explanation).toContain(KNOWLEDGE_FALLBACK_VERSION);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.provider).toBe('mock-llm');
    expect(result.model).toBe('mock-llm-v1');
    expect(typeof result.promptVersion).toBe('string');
    expect(result.promptVersion.length).toBeGreaterThan(0);

    const auditEvents = await auditRepository.findByResource(`Knowledge:${result.knowledgeId}`);
    expect(auditEvents.length).toBeGreaterThanOrEqual(1);
    expect(auditEvents[0].operation).toBe('KNOWLEDGE_PLAN_GENERATED');
  });
});
