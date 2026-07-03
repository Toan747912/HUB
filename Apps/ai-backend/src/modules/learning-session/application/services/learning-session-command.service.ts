import {
  SessionId,
  GoalId,
  RoadmapId,
  LearnerId,
  AssessmentId,
  SkillId,
} from '../../../../shared/domain/identifiers';
import { LearningSession } from '../../domain/aggregates/learning-session.aggregate';
import { SessionTask } from '../../domain/entities/session-task.entity';
import { ILearningSessionRepository } from '../contracts/learning-session-repository.contract';
import { IEventPublisher } from '../contracts/event-publisher.contract';
import { MetricsService } from '../../../../infrastructure/observability/metrics.service';
import { CreateLearningSessionCommand } from '../commands/create-learning-session.command';
import { StartLearningSessionCommand } from '../commands/start-learning-session.command';
import { PauseLearningSessionCommand } from '../commands/pause-learning-session.command';
import { ResumeLearningSessionCommand } from '../commands/resume-learning-session.command';
import { CompleteLearningSessionCommand } from '../commands/complete-learning-session.command';
import { CancelLearningSessionCommand } from '../commands/cancel-learning-session.command';
import { RecordEvidenceCommand } from '../commands/record-evidence.command';
import { ToggleSessionTaskCommand } from '../commands/toggle-session-task.command';
import { SaveSessionNotesCommand } from '../commands/save-session-notes.command';
import { SubmitSessionReflectionCommand } from '../commands/submit-session-reflection.command';
import { SessionReflection } from '../../domain/entities/session-reflection.entity';
import { LearningSessionDomainError } from '../../domain/errors/learning-session-domain.error';

type EventContext = {
  traceId: string;
  correlationId: string;
  causationId: string;
};

export class LearningSessionCommandService {
  constructor(
    private readonly repository: ILearningSessionRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly metrics?: MetricsService,
  ) {}

  async createLearningSession(command: CreateLearningSessionCommand): Promise<LearningSession> {
    const start = Date.now();
    try {
      const session = LearningSession.create(
        {
          sessionId: SessionId.create(command.sessionId),
          goalId: GoalId.create(command.goalId),
          roadmapId: RoadmapId.create(command.roadmapId),
          learnerId: LearnerId.create(command.learnerId),
          assessmentId: command.assessmentId ? AssessmentId.create(command.assessmentId) : null,
        },
        {
          traceId: command.traceId,
          correlationId: command.correlationId,
          causationId: command.causationId,
        },
      );

      if (command.tasks && command.tasks.length > 0) {
        for (const t of command.tasks) {
          session.addTask(new SessionTask(t.id, t.title, false, null, SkillId.create(t.skillId)));
        }
      }

      await this.repository.save(session);
      const events = session.pullEvents();
      await this.eventPublisher.publishMany(events);

      this.metrics?.incrementLearningSessionsCreated();
      this.log('CREATE_LEARNING_SESSION', command.sessionId, start, 'SUCCESS');
      return session;
    } catch (error) {
      this.log('CREATE_LEARNING_SESSION', command.sessionId, start, 'FAILURE', error);
      throw error;
    }
  }

  async startLearningSession(command: StartLearningSessionCommand): Promise<LearningSession> {
    const start = Date.now();
    try {
      const session = await this.repository.findById(command.sessionId);
      if (!session)
        throw new LearningSessionDomainError(
          'SESSION_NOT_FOUND',
          `Session ${command.sessionId} not found`,
        );

      // Single-Active Session Invariant: Pause other active sessions for this learner
      await this.pauseOtherActiveSessions(
        session.getLearnerId().toString(),
        session.getId().toString(),
        {
          traceId: command.traceId,
          correlationId: command.correlationId,
          causationId: command.causationId,
        },
      );

      session.start(
        {
          traceId: command.traceId,
          correlationId: command.correlationId,
          causationId: command.causationId,
        },
        command.expectedVersion,
      );

      await this.repository.save(session);
      const events = session.pullEvents();
      await this.eventPublisher.publishMany(events);

      this.log('START_LEARNING_SESSION', command.sessionId, start, 'SUCCESS');
      return session;
    } catch (error) {
      this.log('START_LEARNING_SESSION', command.sessionId, start, 'FAILURE', error);
      throw error;
    }
  }

  async pauseLearningSession(command: PauseLearningSessionCommand): Promise<LearningSession> {
    const start = Date.now();
    try {
      const session = await this.repository.findById(command.sessionId);
      if (!session)
        throw new LearningSessionDomainError(
          'SESSION_NOT_FOUND',
          `Session ${command.sessionId} not found`,
        );

      session.pause(
        command.reason,
        {
          traceId: command.traceId,
          correlationId: command.correlationId,
          causationId: command.causationId,
        },
        command.expectedVersion,
      );

      await this.repository.save(session);
      const events = session.pullEvents();
      await this.eventPublisher.publishMany(events);

      this.log('PAUSE_LEARNING_SESSION', command.sessionId, start, 'SUCCESS');
      return session;
    } catch (error) {
      this.log('PAUSE_LEARNING_SESSION', command.sessionId, start, 'FAILURE', error);
      throw error;
    }
  }

  async resumeLearningSession(command: ResumeLearningSessionCommand): Promise<LearningSession> {
    const start = Date.now();
    try {
      const session = await this.repository.findById(command.sessionId);
      if (!session)
        throw new LearningSessionDomainError(
          'SESSION_NOT_FOUND',
          `Session ${command.sessionId} not found`,
        );

      // Single-Active Session Invariant: Pause other active sessions for this learner
      await this.pauseOtherActiveSessions(
        session.getLearnerId().toString(),
        session.getId().toString(),
        {
          traceId: command.traceId,
          correlationId: command.correlationId,
          causationId: command.causationId,
        },
      );

      session.resume(
        {
          traceId: command.traceId,
          correlationId: command.correlationId,
          causationId: command.causationId,
        },
        command.expectedVersion,
      );

      await this.repository.save(session);
      const events = session.pullEvents();
      await this.eventPublisher.publishMany(events);

      this.log('RESUME_LEARNING_SESSION', command.sessionId, start, 'SUCCESS');
      return session;
    } catch (error) {
      this.log('RESUME_LEARNING_SESSION', command.sessionId, start, 'FAILURE', error);
      throw error;
    }
  }

  async completeLearningSession(command: CompleteLearningSessionCommand): Promise<LearningSession> {
    const start = Date.now();
    try {
      const session = await this.repository.findById(command.sessionId);
      if (!session)
        throw new LearningSessionDomainError(
          'SESSION_NOT_FOUND',
          `Session ${command.sessionId} not found`,
        );

      // Get duration before completing
      let totalDuration = 0;
      session.getTimers().forEach((t) => {
        totalDuration += t.getCurrentElapsedSeconds();
      });

      session.complete(
        {
          traceId: command.traceId,
          correlationId: command.correlationId,
          causationId: command.causationId,
        },
        command.expectedVersion,
      );

      await this.repository.save(session);
      const events = session.pullEvents();
      await this.eventPublisher.publishMany(events);

      // Record business metrics
      this.metrics?.incrementLearningSessionsCompleted();
      this.metrics?.recordLearningSessionDuration(totalDuration);
      this.metrics?.recordLearningSessionFocus(session.calculateFocusScore());
      this.metrics?.recordLearningSessionEngagement(session.calculateEngagementScore());
      this.metrics?.recordLearningSessionCompletionRate(session.getProgress().completionRate);

      this.log('COMPLETE_LEARNING_SESSION', command.sessionId, start, 'SUCCESS');
      return session;
    } catch (error) {
      this.log('COMPLETE_LEARNING_SESSION', command.sessionId, start, 'FAILURE', error);
      throw error;
    }
  }

  async cancelLearningSession(command: CancelLearningSessionCommand): Promise<LearningSession> {
    const start = Date.now();
    try {
      const session = await this.repository.findById(command.sessionId);
      if (!session)
        throw new LearningSessionDomainError(
          'SESSION_NOT_FOUND',
          `Session ${command.sessionId} not found`,
        );

      session.cancel(
        command.reason,
        {
          traceId: command.traceId,
          correlationId: command.correlationId,
          causationId: command.causationId,
        },
        command.expectedVersion,
      );

      await this.repository.save(session);
      const events = session.pullEvents();
      await this.eventPublisher.publishMany(events);

      this.log('CANCEL_LEARNING_SESSION', command.sessionId, start, 'SUCCESS');
      return session;
    } catch (error) {
      this.log('CANCEL_LEARNING_SESSION', command.sessionId, start, 'FAILURE', error);
      throw error;
    }
  }

  async recordEvidence(command: RecordEvidenceCommand): Promise<LearningSession> {
    const start = Date.now();
    try {
      const session = await this.repository.findById(command.sessionId);
      if (!session)
        throw new LearningSessionDomainError(
          'SESSION_NOT_FOUND',
          `Session ${command.sessionId} not found`,
        );

      session.recordEvidence(
        {
          evidenceId: command.evidenceId,
          activityId: command.activityId,
          completedTasks: command.completedTasks,
          timeSpent: command.timeSpent,
          interruptions: command.interruptions,
          revisionCount: command.revisionCount,
          focusScore: command.focusScore,
          engagementScore: command.engagementScore,
        },
        {
          traceId: command.traceId,
          correlationId: command.correlationId,
          causationId: command.causationId,
        },
        command.expectedVersion,
      );

      await this.repository.save(session);
      const events = session.pullEvents();
      await this.eventPublisher.publishMany(events);

      this.metrics?.incrementEvidenceRecords();
      this.log('RECORD_EVIDENCE', command.sessionId, start, 'SUCCESS');
      return session;
    } catch (error) {
      this.log('RECORD_EVIDENCE', command.sessionId, start, 'FAILURE', error);
      throw error;
    }
  }

  async toggleSessionTask(command: ToggleSessionTaskCommand): Promise<LearningSession> {
    const start = Date.now();
    try {
      const session = await this.repository.findById(command.sessionId);
      if (!session)
        throw new LearningSessionDomainError(
          'SESSION_NOT_FOUND',
          `Session ${command.sessionId} not found`,
        );

      session.toggleTask(
        command.taskId,
        command.completed,
        {
          traceId: command.traceId,
          correlationId: command.correlationId,
          causationId: command.causationId,
        },
        command.expectedVersion,
      );

      await this.repository.save(session);
      const events = session.pullEvents();
      await this.eventPublisher.publishMany(events);

      this.log('TOGGLE_SESSION_TASK', command.sessionId, start, 'SUCCESS');
      return session;
    } catch (error) {
      this.log('TOGGLE_SESSION_TASK', command.sessionId, start, 'FAILURE', error);
      throw error;
    }
  }

  async saveSessionNotes(command: SaveSessionNotesCommand): Promise<LearningSession> {
    const start = Date.now();
    try {
      const session = await this.repository.findById(command.sessionId);
      if (!session)
        throw new LearningSessionDomainError(
          'SESSION_NOT_FOUND',
          `Session ${command.sessionId} not found`,
        );

      session.saveNotes(command.content);

      await this.repository.save(session);
      const events = session.pullEvents();
      await this.eventPublisher.publishMany(events);

      this.log('SAVE_SESSION_NOTES', command.sessionId, start, 'SUCCESS');
      return session;
    } catch (error) {
      this.log('SAVE_SESSION_NOTES', command.sessionId, start, 'FAILURE', error);
      throw error;
    }
  }

  async submitSessionReflection(command: SubmitSessionReflectionCommand): Promise<LearningSession> {
    const start = Date.now();
    try {
      const session = await this.repository.findById(command.sessionId);
      if (!session)
        throw new LearningSessionDomainError(
          'SESSION_NOT_FOUND',
          `Session ${command.sessionId} not found`,
        );

      session.addReflection(
        new SessionReflection(command.content, command.rating),
        command.expectedVersion,
      );

      await this.repository.save(session);
      const events = session.pullEvents();
      await this.eventPublisher.publishMany(events);

      this.log('SUBMIT_SESSION_REFLECTION', command.sessionId, start, 'SUCCESS');
      return session;
    } catch (error) {
      this.log('SUBMIT_SESSION_REFLECTION', command.sessionId, start, 'FAILURE', error);
      throw error;
    }
  }

  private async pauseOtherActiveSessions(
    learnerId: string,
    currentSessionId: string,
    context: EventContext,
  ): Promise<void> {
    const activeSessions = (await this.repository.findByLearnerId(learnerId)).filter(
      (s) => s.getStatus() === 'ACTIVE' && s.getId().toString() !== currentSessionId,
    );

    for (const active of activeSessions) {
      active.pause('Paused due to new active session launch', context);
      await this.repository.save(active);
      const events = active.pullEvents();
      await this.eventPublisher.publishMany(events);
    }
  }

  private log(
    operation: string,
    aggregateId: string,
    startMs: number,
    status: string,
    error?: unknown,
  ): void {
    console.log(
      JSON.stringify({
        traceId: 'app',
        aggregateId,
        operation,
        latencyMs: Date.now() - startMs,
        status,
        errorType: error instanceof Error ? error.constructor.name : undefined,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
