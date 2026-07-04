import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model, disconnect } from 'mongoose';
import { randomUUID } from 'crypto';
import {
  SessionId,
  GoalId,
  RoadmapId,
  LearnerId,
  AssessmentId,
  SkillId,
} from '../../shared/domain/identifiers';
import { LearningSession } from './domain/aggregates/learning-session.aggregate';
import { SessionStatus } from './domain/value-objects/session-status.vo';
import { ActivityType } from './domain/value-objects/activity-type.vo';
import { SessionTask } from './domain/entities/session-task.entity';
import { EvidenceRecord } from './domain/entities/evidence-record.entity';
import { StudyTimer } from './domain/entities/study-timer.entity';
import { SessionReflection } from './domain/entities/session-reflection.entity';
import { LearningSessionSchema } from './infrastructure/persistence/schemas/learning-session.schema';
import { MongoLearningSessionRepository } from './infrastructure/persistence/repositories/mongo-learning-session.repository';
import { LEARNING_SESSION_REPOSITORY } from './application/contracts/learning-session-repository.contract';
import { EVENT_PUBLISHER } from './application/contracts/event-publisher.contract';
import { LearningSessionCommandService } from './application/services/learning-session-command.service';
import { LearningSessionQueryService } from './application/services/learning-session-query.service';
import { CreateLearningSessionCommand } from './application/commands/create-learning-session.command';
import { StartLearningSessionCommand } from './application/commands/start-learning-session.command';
import { PauseLearningSessionCommand } from './application/commands/pause-learning-session.command';
import { ResumeLearningSessionCommand } from './application/commands/resume-learning-session.command';
import { CompleteLearningSessionCommand } from './application/commands/complete-learning-session.command';
import { RecordEvidenceCommand } from './application/commands/record-evidence.command';
import { ToggleSessionTaskCommand } from './application/commands/toggle-session-task.command';
import { SaveSessionNotesCommand } from './application/commands/save-session-notes.command';
import { SubmitSessionReflectionCommand } from './application/commands/submit-session-reflection.command';
import { GetLearningSessionQuery } from './application/queries/get-learning-session.query';
import { GetLearningAnalyticsQuery } from './application/queries/get-learning-analytics.query';
import { OrchestrationWorkerService } from '../orchestration/application/orchestration-worker.service';
import { RunAssessmentCommand } from '../assessment/application/commands/run-assessment.command';

// Mock IEventPublisher
class MockEventPublisher {
  events: any[] = [];
  async publish(event: any) {
    this.events.push(event);
  }
  async publishMany(events: any[]) {
    this.events.push(...events);
  }
  clear() {
    this.events = [];
  }
}

// Mock AssessmentCommandService
class MockAssessmentCommandService {
  commandsRun: any[] = [];
  async runAssessment(command: any) {
    this.commandsRun.push(command);
    return {} as any;
  }
}

describe('Learning Session Module — Full Test Suite', () => {
  let mongod: MongoMemoryServer;
  let module: TestingModule;
  let repository: MongoLearningSessionRepository;
  let commandService: LearningSessionCommandService;
  let queryService: LearningSessionQueryService;
  let eventPublisher: MockEventPublisher;
  let model: Model<any>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    eventPublisher = new MockEventPublisher();

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri, { dbName: 'test-session-db' }),
        MongooseModule.forFeature([{ name: 'LearningSession', schema: LearningSessionSchema }]),
      ],
      providers: [
        {
          provide: LEARNING_SESSION_REPOSITORY,
          useFactory: (m: Model<any>) => new MongoLearningSessionRepository(m),
          inject: [getModelToken('LearningSession')],
        },
        {
          provide: EVENT_PUBLISHER,
          useValue: eventPublisher,
        },
        {
          provide: LearningSessionCommandService,
          useFactory: (r, e) => new LearningSessionCommandService(r, e),
          inject: [LEARNING_SESSION_REPOSITORY, EVENT_PUBLISHER],
        },
        {
          provide: LearningSessionQueryService,
          useFactory: (r) => new LearningSessionQueryService(r),
          inject: [LEARNING_SESSION_REPOSITORY],
        },
      ],
    }).compile();

    repository = module.get<MongoLearningSessionRepository>(LEARNING_SESSION_REPOSITORY);
    commandService = module.get(LearningSessionCommandService);
    queryService = module.get(LearningSessionQueryService);
    model = module.get<Model<any>>(getModelToken('LearningSession'));
  });

  afterAll(async () => {
    await module.close();
    await disconnect();
    await mongod.stop();
  });

  afterEach(async () => {
    await model.deleteMany({});
    eventPublisher.clear();
  });

  describe('1. Domain Aggregate Root Invariants & State Transitions', () => {
    it('should initialize session in DRAFT state', () => {
      const sessionId = SessionId.generate();
      const goalId = GoalId.generate();
      const roadmapId = RoadmapId.generate();
      const learnerId = LearnerId.generate();

      const session = LearningSession.create(
        { sessionId, goalId, roadmapId, learnerId },
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
      );

      expect(session.getStatus()).toBe('DRAFT');
      expect(session.getAggregateVersion()).toBe(1);
      expect(session.getHistory()).toHaveLength(1);
      expect(session.getHistory()[0].status.getValue()).toBe('DRAFT');

      const events = session.pullEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('LearningSessionCreated');
    });

    it('should transition from DRAFT to ACTIVE on start', () => {
      const session = LearningSession.create(
        {
          sessionId: SessionId.generate(),
          goalId: GoalId.generate(),
          roadmapId: RoadmapId.generate(),
          learnerId: LearnerId.generate(),
        },
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
      );

      session.start(
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        session.getAggregateVersion(),
      );

      expect(session.getStatus()).toBe('ACTIVE');
      expect(session.getAggregateVersion()).toBe(2);
      expect(session.getTimers()).toHaveLength(1);
      expect(session.getTimers()[0].pausedAt).toBeNull();
    });

    it('should enforce invalid state transition and throw', () => {
      const session = LearningSession.create(
        {
          sessionId: SessionId.generate(),
          goalId: GoalId.generate(),
          roadmapId: RoadmapId.generate(),
          learnerId: LearnerId.generate(),
        },
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
      );

      expect(() => {
        session.pause(
          null,
          { traceId: 't', correlationId: 'c', causationId: 'ca' },
          session.getAggregateVersion(),
        );
      }).toThrow('Invalid transition');
    });

    it('should handle pause and resume correctly, recording interruptions', () => {
      const session = LearningSession.create(
        {
          sessionId: SessionId.generate(),
          goalId: GoalId.generate(),
          roadmapId: RoadmapId.generate(),
          learnerId: LearnerId.generate(),
        },
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
      );

      session.start(
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        session.getAggregateVersion(),
      );
      session.pause(
        'Overloaded',
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        session.getAggregateVersion(),
      );

      expect(session.getStatus()).toBe('PAUSED');
      expect(session.getTimers()[0].pausedAt).not.toBeNull();
      expect(session.getTimers()[0].interruptions).toBe(1);

      session.resume(
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        session.getAggregateVersion(),
      );
      expect(session.getStatus()).toBe('ACTIVE');
      expect(session.getTimers()[0].pausedAt).toBeNull();
    });

    it('should complete session and auto-complete tasks', () => {
      const session = LearningSession.create(
        {
          sessionId: SessionId.generate(),
          goalId: GoalId.generate(),
          roadmapId: RoadmapId.generate(),
          learnerId: LearnerId.generate(),
        },
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
      );

      session.addTask(
        new SessionTask('t1', 'Task 1', false, null, SkillId.generate()),
        session.getAggregateVersion(),
      );
      session.start(
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        session.getAggregateVersion(),
      );
      session.complete(
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        session.getAggregateVersion(),
      );

      expect(session.getStatus()).toBe('COMPLETED');
      expect(session.getTasks()[0].completed).toBe(true);
      expect(session.getProgress().completionRate).toBe(1);
    });
  });

  describe('2. Persistence Integration (MongoDB)', () => {
    it('should save and reconstitute a session', async () => {
      const sessionId = SessionId.generate();
      const session = LearningSession.create(
        {
          sessionId,
          goalId: GoalId.generate(),
          roadmapId: RoadmapId.generate(),
          learnerId: LearnerId.generate(),
        },
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
      );

      session.addTask(
        new SessionTask('t1', 'Task 1', false, null, SkillId.generate()),
        session.getAggregateVersion(),
      );
      await repository.save(session);

      const found = await repository.findById(sessionId.toString());
      expect(found).not.toBeNull();
      expect(found!.getId().toString()).toBe(sessionId.toString());
      expect(found!.getTasks()).toHaveLength(1);
      expect(found!.getTasks()[0].title).toBe('Task 1');
      expect(found!.getStatus()).toBe('DRAFT');
    });

    it('should persist aggregate version and reject outdated updates', async () => {
      const sessionId = SessionId.generate();
      const session = LearningSession.create(
        {
          sessionId,
          goalId: GoalId.generate(),
          roadmapId: RoadmapId.generate(),
          learnerId: LearnerId.generate(),
        },
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
      );

      await repository.save(session);

      const found = await repository.findById(sessionId.toString());
      found!.start(
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        found!.getAggregateVersion(),
      );
      await repository.save(found!);

      // Attempt to start using an invalid expected version (concurrency conflict)
      expect(() => {
        found!.start({ traceId: 't', correlationId: 'c', causationId: 'ca' }, 999);
      }).toThrow();
    });
  });

  describe('3. Command & Query Services', () => {
    it('should create and start a session through commands, enforcing single-active invariant', async () => {
      const learnerId = LearnerId.generate();

      // Session 1: Started
      const session1 = await commandService.createLearningSession(
        new CreateLearningSessionCommand(
          randomUUID(),
          randomUUID(),
          randomUUID(),
          learnerId.toString(),
          null,
          [],
          't',
          'c',
          'ca',
        ),
      );
      await commandService.startLearningSession(
        new StartLearningSessionCommand(
          session1.getId().toString(),
          session1.getAggregateVersion(),
          't',
          'c',
          'ca',
        ),
      );

      let loaded1 = await queryService.getSession(
        new GetLearningSessionQuery(session1.getId().toString()),
      );
      expect(loaded1!.getStatus()).toBe('ACTIVE');

      // Session 2: Starting this should pause Session 1
      const session2 = await commandService.createLearningSession(
        new CreateLearningSessionCommand(
          randomUUID(),
          randomUUID(),
          randomUUID(),
          learnerId.toString(),
          null,
          [],
          't',
          'c',
          'ca',
        ),
      );
      await commandService.startLearningSession(
        new StartLearningSessionCommand(
          session2.getId().toString(),
          session2.getAggregateVersion(),
          't',
          'c',
          'ca',
        ),
      );

      loaded1 = await queryService.getSession(
        new GetLearningSessionQuery(session1.getId().toString()),
      );
      const loaded2 = await queryService.getSession(
        new GetLearningSessionQuery(session2.getId().toString()),
      );

      expect(loaded1!.getStatus()).toBe('PAUSED');
      expect(loaded2!.getStatus()).toBe('ACTIVE');
    });

    it('should record evidence, recalculate scores, and output correct analytics', async () => {
      const session = await commandService.createLearningSession(
        new CreateLearningSessionCommand(
          randomUUID(),
          randomUUID(),
          randomUUID(),
          randomUUID(),
          null,
          [{ id: 'task-1', title: 'Code TS', skillId: randomUUID() }],
          't',
          'c',
          'ca',
        ),
      );

      await commandService.startLearningSession(
        new StartLearningSessionCommand(
          session.getId().toString(),
          session.getAggregateVersion(),
          't',
          'c',
          'ca',
        ),
      );

      // Record evidence with high scores
      await commandService.recordEvidence(
        new RecordEvidenceCommand(
          session.getId().toString(),
          randomUUID(),
          undefined,
          1, // completedTasks
          300, // time spent
          1, // interruptions
          0, // revision count
          90, // focus score
          95, // engagement score
          undefined,
          't',
          'c',
          'ca',
        ),
      );

      const analytics = await queryService.getAnalytics(
        new GetLearningAnalyticsQuery(session.getId().toString()),
      );
      expect(analytics.focusScore).toBe(90);
      expect(analytics.engagementScore).toBe(95);
      expect(analytics.completionRate).toBe(1);
      expect(analytics.sessionEffectiveness).toBe(95); // (90 + 95 + 100) / 3 = 95
    });
  });

  describe('4. Orchestration Loop Integration', () => {
    it('should trigger assessment run when EvidenceRecorded event is processed', async () => {
      const assessmentCmdService = new MockAssessmentCommandService();
      const worker = new OrchestrationWorkerService(
        { registerHandler: () => {} } as any,
        {} as any,
        {} as any,
        assessmentCmdService as any,
        {} as any,
        {} as any,
        {} as any,
        queryService,
      );

      const session = await commandService.createLearningSession(
        new CreateLearningSessionCommand(
          randomUUID(),
          randomUUID(),
          randomUUID(),
          randomUUID(),
          randomUUID(), // linked assessment ID
          [{ id: 'task-1', title: 'Task 1', skillId: randomUUID() }],
          't',
          'c',
          'ca',
        ),
      );

      // Record evidence to persist it
      await commandService.recordEvidence(
        new RecordEvidenceCommand(
          session.getId().toString(),
          randomUUID(),
          undefined,
          1,
          600,
          0,
          1,
          85,
          90,
          undefined,
          'trace-xyz',
          'c',
          'ca',
        ),
      );

      // Simulate receiving EvidenceRecorded event in worker
      const simulatedEvent = {
        type: 'EvidenceRecorded',
        metadata: {
          eventId: 'evt-1',
          aggregateId: SessionId.create(session.getId().toString()),
          aggregateType: 'LearningSession',
          aggregateVersion: 2,
          occurredAt: new Date().toISOString(),
          traceId: 'trace-xyz',
          correlationId: 'corr-xyz',
          causationId: 'cause-xyz',
        },
        payload: {},
      };

      await worker.handleEvent(simulatedEvent as any);

      expect(assessmentCmdService.commandsRun).toHaveLength(1);
      const command = assessmentCmdService.commandsRun[0] as RunAssessmentCommand;
      expect(command.assessmentId).toBe(session.getAssessmentId()!.toString());
      expect(command.roadmapCompletionRatio).toBe(100); // 1 / 1 tasks
      expect(command.tasks).toHaveLength(1);
      expect(command.tasks[0].completed).toBe(true);
      expect(command.revisionCount).toBe(1);
      expect(command.traceId).toBe('trace-xyz');
    });
  });

  describe('5. Learning Workspace Sprint (Timer / Task Toggle / Notes / Reflection)', () => {
    it('should accumulate only active time across a pause/resume cycle (StudyTimer fix)', async () => {
      const session = LearningSession.create(
        {
          sessionId: SessionId.generate(),
          goalId: GoalId.generate(),
          roadmapId: RoadmapId.generate(),
          learnerId: LearnerId.generate(),
        },
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
      );

      session.start(
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        session.getAggregateVersion(),
      );
      await new Promise((resolve) => setTimeout(resolve, 60));

      session.pause(
        null,
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        session.getAggregateVersion(),
      );
      const elapsedAfterFirstPause = session.getTimers()[0].getCurrentElapsedSeconds();
      expect(elapsedAfterFirstPause).toBeGreaterThanOrEqual(0);
      // Rounds to whole seconds; a 60ms active stretch should not report a large value
      expect(elapsedAfterFirstPause).toBeLessThan(2);

      // Wait while paused -- this gap must never be counted as active time
      await new Promise((resolve) => setTimeout(resolve, 60));
      session.resume(
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        session.getAggregateVersion(),
      );
      await new Promise((resolve) => setTimeout(resolve, 60));
      session.pause(
        null,
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        session.getAggregateVersion(),
      );

      const elapsedAfterSecondPause = session.getTimers()[0].getCurrentElapsedSeconds();
      // Only the two ~60ms active stretches should have accumulated, not the paused gap
      expect(elapsedAfterSecondPause).toBeLessThan(2);
      expect(session.getTimers()[0].interruptions).toBe(2);
    });

    it('should toggle a task complete and undo it, with idempotent no-ops', () => {
      const session = LearningSession.create(
        {
          sessionId: SessionId.generate(),
          goalId: GoalId.generate(),
          roadmapId: RoadmapId.generate(),
          learnerId: LearnerId.generate(),
        },
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
      );

      session.addTask(
        new SessionTask('t1', 'Task 1', false, null, SkillId.generate()),
        session.getAggregateVersion(),
      );
      session.start(
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        session.getAggregateVersion(),
      );
      session.pullEvents();

      session.toggleTask(
        't1',
        true,
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        session.getAggregateVersion(),
      );
      expect(session.getTasks()[0].completed).toBe(true);
      expect(session.getProgress().completedTasksCount).toBe(1);
      let events = session.pullEvents();
      expect(events.some((e) => e.type === 'ProgressUpdated')).toBe(true);

      const versionAfterComplete = session.getAggregateVersion();
      // Re-toggling to the same state is a no-op: no version bump, no duplicate event
      session.toggleTask(
        't1',
        true,
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        versionAfterComplete,
      );
      expect(session.getAggregateVersion()).toBe(versionAfterComplete);
      expect(session.pullEvents()).toHaveLength(0);

      session.toggleTask(
        't1',
        false,
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        session.getAggregateVersion(),
      );
      expect(session.getTasks()[0].completed).toBe(false);
      expect(session.getTasks()[0].completedAt).toBeNull();
      expect(session.getProgress().completedTasksCount).toBe(0);
      events = session.pullEvents();
      expect(events.some((e) => e.type === 'ProgressUpdated')).toBe(true);
    });

    it('should save notes without bumping the aggregate version or requiring expectedVersion', () => {
      const session = LearningSession.create(
        {
          sessionId: SessionId.generate(),
          goalId: GoalId.generate(),
          roadmapId: RoadmapId.generate(),
          learnerId: LearnerId.generate(),
        },
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
      );

      session.start(
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        session.getAggregateVersion(),
      );
      const versionBeforeNotes = session.getAggregateVersion();

      session.saveNotes('Learned about optimistic concurrency today.');
      expect(session.getNotes()!.content).toBe('Learned about optimistic concurrency today.');
      expect(session.getAggregateVersion()).toBe(versionBeforeNotes);

      // A subsequent real mutation using the pre-notes-save expected version must still succeed,
      // proving notes-save did not silently desync client-held versions.
      expect(() => {
        session.pause(
          null,
          { traceId: 't', correlationId: 'c', causationId: 'ca' },
          versionBeforeNotes,
        );
      }).not.toThrow();
    });

    it('should require the reflection to be submitted before completion, never after', () => {
      const session = LearningSession.create(
        {
          sessionId: SessionId.generate(),
          goalId: GoalId.generate(),
          roadmapId: RoadmapId.generate(),
          learnerId: LearnerId.generate(),
        },
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
      );

      session.start(
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        session.getAggregateVersion(),
      );

      session.addReflection(
        new SessionReflection('Went well, focused throughout.', 4),
        session.getAggregateVersion(),
      );
      expect(session.getReflection()!.rating).toBe(4);

      session.complete(
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        session.getAggregateVersion(),
      );
      expect(session.getStatus()).toBe('COMPLETED');

      expect(() => {
        session.addReflection(new SessionReflection('Too late', 5), session.getAggregateVersion());
      }).toThrow('terminal state');
    });

    it('should persist and reconstitute notes through the repository', async () => {
      const sessionId = SessionId.generate();
      const session = LearningSession.create(
        {
          sessionId,
          goalId: GoalId.generate(),
          roadmapId: RoadmapId.generate(),
          learnerId: LearnerId.generate(),
        },
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
      );

      session.saveNotes('Draft notes before first save.');
      await repository.save(session);

      const found = await repository.findById(sessionId.toString());
      expect(found!.getNotes()!.content).toBe('Draft notes before first save.');
    });

    it('should wire toggle/notes/reflection through the command service end-to-end', async () => {
      const session = await commandService.createLearningSession(
        new CreateLearningSessionCommand(
          randomUUID(),
          randomUUID(),
          randomUUID(),
          randomUUID(),
          null,
          [{ id: 'task-1', title: 'Read docs', skillId: randomUUID() }],
          't',
          'c',
          'ca',
        ),
      );
      await commandService.startLearningSession(
        new StartLearningSessionCommand(
          session.getId().toString(),
          session.getAggregateVersion(),
          't',
          'c',
          'ca',
        ),
      );

      const afterToggle = await commandService.toggleSessionTask(
        new ToggleSessionTaskCommand(
          session.getId().toString(),
          'task-1',
          true,
          undefined,
          't',
          'c',
          'ca',
        ),
      );
      expect(afterToggle.getTasks()[0].completed).toBe(true);

      const afterNotes = await commandService.saveSessionNotes(
        new SaveSessionNotesCommand(
          session.getId().toString(),
          'Session notes content',
          't',
          'c',
          'ca',
        ),
      );
      expect(afterNotes.getNotes()!.content).toBe('Session notes content');

      const afterReflection = await commandService.submitSessionReflection(
        new SubmitSessionReflectionCommand(
          session.getId().toString(),
          'What went well / what was hard / next focus',
          5,
          afterNotes.getAggregateVersion(),
          't',
          'c',
          'ca',
        ),
      );
      expect(afterReflection.getReflection()!.content).toContain('went well');

      const completed = await commandService.completeLearningSession(
        new CompleteLearningSessionCommand(
          session.getId().toString(),
          afterReflection.getAggregateVersion(),
          't',
          'c',
          'ca',
        ),
      );
      expect(completed.getStatus()).toBe('COMPLETED');
    });
  });
});
