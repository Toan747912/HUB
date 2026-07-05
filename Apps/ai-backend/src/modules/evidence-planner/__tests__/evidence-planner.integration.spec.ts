import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import { EVIDENCE_FALLBACK_VERSION } from '../domain/engine/evidence-planning.engine';
import { EvidencePlannerModule } from '../evidence-planner.module';
import { EvidencePlannerService } from '../application/services/evidence-planner.service';

describe('EvidencePlannerModule — integration', () => {
  let module: TestingModule;
  let service: EvidencePlannerService;
  let auditRepository: AuditLogRepository;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        EvidencePlannerModule,
      ],
    }).compile();

    service = module.get(EvidencePlannerService);
    auditRepository = module.get(AuditLogRepository);
  });

  afterAll(async () => {
    await module.close();
  });

  it('resolves through the real module graph without reaching a repository directly', () => {
    expect(service).toBeInstanceOf(EvidencePlannerService);
  });

  it('plans evidence end-to-end, falling back deterministically when the mock LLM output does not match the evidence contract, and records an audit event', async () => {
    const result = await service.planEvidence({
      userId: 'user-1',
      goalId: 'goal-1',
      sessionId: 'session-1',
      traceId: 'trace-integration-1',
    });

    // The shared MockLlmClientService returns a generic explainable payload
    // with no "requirements" field, so a correctly-wired Evidence Planner
    // must reject it and fall back to the deterministic engine rather than
    // fabricating evidence requirements.
    expect(result.fallbackUsed).toBe(true);
    expect(result.explanation).toContain(EVIDENCE_FALLBACK_VERSION);
    expect(result.requirements.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.provider).toBe('mock-llm');
    expect(result.model).toBe('mock-llm-v1');
    expect(typeof result.promptVersion).toBe('string');
    expect(result.promptVersion.length).toBeGreaterThan(0);

    const auditEvents = await auditRepository.findByResource(`Evidence:${result.evidenceId}`);
    expect(auditEvents.length).toBeGreaterThanOrEqual(1);
    expect(auditEvents[0].operation).toBe('EVIDENCE_PLAN_GENERATED');
  });
});
