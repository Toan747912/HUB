import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import { TEACHING_FALLBACK_VERSION } from '../domain/engine/teaching-planning.engine';
import { TeachingPlannerModule } from '../teaching-planner.module';
import { TeachingPlannerService } from '../application/services/teaching-planner.service';

describe('TeachingPlannerModule — integration', () => {
  let module: TestingModule;
  let service: TeachingPlannerService;
  let auditRepository: AuditLogRepository;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TeachingPlannerModule,
      ],
    }).compile();

    service = module.get(TeachingPlannerService);
    auditRepository = module.get(AuditLogRepository);
  });

  afterAll(async () => {
    await module.close();
  });

  it('resolves through the real module graph without reaching a repository directly', () => {
    expect(service).toBeInstanceOf(TeachingPlannerService);
  });

  it('plans teaching actions end-to-end, falling back deterministically when the mock LLM output does not match the teaching contract, and records an audit event', async () => {
    const result = await service.planTeaching({
      userId: 'user-1',
      goalId: 'goal-1',
      sessionId: 'session-1',
      traceId: 'trace-integration-1',
    });

    // The shared MockLlmClientService returns a generic explainable payload
    // with no "actions" field, so a correctly-wired Teaching Planner must
    // reject it and fall back to the deterministic engine rather than
    // fabricating teaching actions.
    expect(result.fallbackUsed).toBe(true);
    expect(result.explanation).toContain(TEACHING_FALLBACK_VERSION);
    expect(result.actions.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.provider).toBe('mock-llm');
    expect(result.model).toBe('mock-llm-v1');
    expect(typeof result.promptVersion).toBe('string');
    expect(result.promptVersion.length).toBeGreaterThan(0);

    const auditEvents = await auditRepository.findByResource(`Teaching:${result.teachingId}`);
    expect(auditEvents.length).toBeGreaterThanOrEqual(1);
    expect(auditEvents[0].operation).toBe('TEACHING_PLAN_GENERATED');
  });
});
