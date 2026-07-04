import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { disconnect } from 'mongoose';
import { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import { MISSION_FALLBACK_VERSION } from '../domain/engine/mission-planning.engine';
import { MissionPlannerModule } from '../mission-planner.module';
import { MissionPlannerService } from '../application/services/mission-planner.service';

jest.setTimeout(300_000);

describe('MissionPlannerModule — integration', () => {
  let mongod: MongoMemoryServer;
  let module: TestingModule;
  let service: MissionPlannerService;
  let auditRepository: AuditLogRepository;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri(), { dbName: 'mission-planner-test' }),
        MissionPlannerModule,
      ],
    }).compile();

    service = module.get(MissionPlannerService);
    auditRepository = module.get(AuditLogRepository);
  });

  afterAll(async () => {
    await module.close();
    await disconnect();
    await mongod.stop();
  });

  it('resolves through the real module graph without reaching a repository directly', () => {
    expect(service).toBeInstanceOf(MissionPlannerService);
  });

  it('generates today\'s mission end-to-end, falling back deterministically when the mock LLM output does not match the mission contract, and records an audit event', async () => {
    const result = await service.generateTodaysMission({
      userId: 'user-1',
      goalId: 'goal-1',
      sessionId: 'session-1',
      traceId: 'trace-integration-1',
    });

    // The shared MockLlmClientService returns a generic explainable payload with
    // no "tasks" field, so a correctly-wired Mission Planner must reject it and
    // fall back to the deterministic engine rather than fabricating tasks.
    expect(result.fallbackUsed).toBe(true);
    expect(result.explanation).toContain(MISSION_FALLBACK_VERSION);
    expect(result.tasks.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.provider).toBe('mock-llm');
    expect(result.model).toBe('mock-llm-v1');
    expect(typeof result.promptVersion).toBe('string');
    expect(result.promptVersion.length).toBeGreaterThan(0);

    const auditEvents = await auditRepository.findByResource(`Mission:${result.missionId}`);
    expect(auditEvents.length).toBeGreaterThanOrEqual(1);
    expect(auditEvents[0].operation).toBe('MISSION_PLAN_GENERATED');
  });
});
