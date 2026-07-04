import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { disconnect } from 'mongoose';
import { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import { DISCOVERY_FALLBACK_VERSION } from '../domain/engine/discovery-planning.engine';
import { DiscoveryPlannerModule } from '../discovery-planner.module';
import { DiscoveryPlannerService } from '../application/services/discovery-planner.service';

jest.setTimeout(300_000);

describe('DiscoveryPlannerModule — integration', () => {
  let mongod: MongoMemoryServer;
  let module: TestingModule;
  let service: DiscoveryPlannerService;
  let auditRepository: AuditLogRepository;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri(), { dbName: 'discovery-planner-test' }),
        DiscoveryPlannerModule,
      ],
    }).compile();

    service = module.get(DiscoveryPlannerService);
    auditRepository = module.get(AuditLogRepository);
  });

  afterAll(async () => {
    await module.close();
    await disconnect();
    await mongod.stop();
  });

  it('resolves through the real module graph without reaching a repository directly', () => {
    expect(service).toBeInstanceOf(DiscoveryPlannerService);
  });

  it('discovers an initial focus end-to-end, falling back deterministically when the mock LLM output does not match the discovery contract, and records an audit event', async () => {
    const result = await service.discoverInitialFocus({
      userId: 'user-1',
      goalId: 'goal-1',
      sessionId: 'session-1',
      traceId: 'trace-integration-1',
    });

    // The shared MockLlmClientService returns a generic explainable payload
    // with no "suggestions" field, so a correctly-wired Discovery Planner must
    // reject it and fall back to the deterministic engine rather than
    // fabricating suggestions.
    expect(result.fallbackUsed).toBe(true);
    expect(result.explanation).toContain(DISCOVERY_FALLBACK_VERSION);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.provider).toBe('mock-llm');
    expect(result.model).toBe('mock-llm-v1');
    expect(typeof result.promptVersion).toBe('string');
    expect(result.promptVersion.length).toBeGreaterThan(0);

    const auditEvents = await auditRepository.findByResource(`Discovery:${result.discoveryId}`);
    expect(auditEvents.length).toBeGreaterThanOrEqual(1);
    expect(auditEvents[0].operation).toBe('DISCOVERY_PLAN_GENERATED');
  });
});
