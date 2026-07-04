import {
  SessionId,
  GoalId,
  RoadmapId,
  LearnerId,
  AssessmentId,
  SkillId,
} from '../../../../../shared/domain/identifiers';
import { LearningSession } from '../../../domain/aggregates/learning-session.aggregate';
import { LearningActivity } from '../../../domain/entities/learning-activity.entity';
import { SessionTask } from '../../../domain/entities/session-task.entity';
import { EvidenceRecord } from '../../../domain/entities/evidence-record.entity';
import { SessionProgress } from '../../../domain/entities/session-progress.entity';
import { StudyTimer } from '../../../domain/entities/study-timer.entity';
import { SessionHistory } from '../../../domain/entities/session-history.entity';
import { SessionReflection } from '../../../domain/entities/session-reflection.entity';
import { SessionNotes } from '../../../domain/entities/session-notes.entity';
import { SessionStatus } from '../../../domain/value-objects/session-status.vo';
import { ActivityType } from '../../../domain/value-objects/activity-type.vo';

export interface LearningSessionDocument {
  _id: string;
  goalId: string;
  roadmapId: string;
  assessmentId?: string | null;
  learnerId: string;
  status: string;
  aggregateVersion: number;
  activities: Array<{
    id: string;
    type: string;
    status: string;
    startedAt?: Date | null;
    endedAt?: Date | null;
    timeSpent: number;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    completed: boolean;
    completedAt?: Date | null;
    skillId: string;
  }>;
  evidence: Array<{
    id: string;
    completedTasks: number;
    timeSpent: number;
    completionRate: number;
    interruptions: number;
    revisionCount: number;
    focusScore: number;
    engagementScore: number;
    recordedAt: Date;
  }>;
  progress: {
    completedTasksCount: number;
    totalTasksCount: number;
    completionRate: number;
    lastUpdatedAt: Date;
  };
  timers: Array<{
    id: string;
    startedAt: Date;
    pausedAt?: Date | null;
    elapsedSeconds: number;
    interruptions: number;
  }>;
  history: Array<{
    status: string;
    updatedAt: Date;
    reason?: string | null;
  }>;
  reflection?: {
    content: string;
    rating: number;
    recordedAt: Date;
  } | null;
  notes?: {
    content: string;
    updatedAt: Date;
  } | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class LearningSessionPersistenceMapper {
  static toDocument(aggregate: LearningSession): LearningSessionDocument {
    const progress = aggregate.getProgress();
    const reflection = aggregate.getReflection();
    const notes = aggregate.getNotes();

    return {
      _id: aggregate.getId().toString(),
      goalId: aggregate.getGoalId().toString(),
      roadmapId: aggregate.getRoadmapId().toString(),
      assessmentId: aggregate.getAssessmentId() ? aggregate.getAssessmentId()!.toString() : null,
      learnerId: aggregate.getLearnerId().toString(),
      status: aggregate.getStatus(),
      aggregateVersion: aggregate.getAggregateVersion(),
      activities: aggregate.getActivities().map((a) => ({
        id: a.id,
        type: a.type.getValue(),
        status: a.status,
        startedAt: a.startedAt,
        endedAt: a.endedAt,
        timeSpent: a.timeSpent,
      })),
      tasks: aggregate.getTasks().map((t) => ({
        id: t.id,
        title: t.title,
        completed: t.completed,
        completedAt: t.completedAt,
        skillId: t.skillId.toString(),
      })),
      evidence: aggregate.getEvidence().map((e) => ({
        id: e.id,
        completedTasks: e.completedTasks,
        timeSpent: e.timeSpent,
        completionRate: e.completionRate,
        interruptions: e.interruptions,
        revisionCount: e.revisionCount,
        focusScore: e.focusScore,
        engagementScore: e.engagementScore,
        recordedAt: e.recordedAt,
      })),
      progress: {
        completedTasksCount: progress.completedTasksCount,
        totalTasksCount: progress.totalTasksCount,
        completionRate: progress.completionRate,
        lastUpdatedAt: progress.lastUpdatedAt,
      },
      timers: aggregate.getTimers().map((t) => ({
        id: t.id,
        startedAt: t.startedAt,
        pausedAt: t.pausedAt,
        elapsedSeconds: t.elapsedSeconds,
        interruptions: t.interruptions,
      })),
      history: aggregate.getHistory().map((h) => ({
        status: h.status.getValue(),
        updatedAt: h.updatedAt,
        reason: h.reason,
      })),
      reflection: reflection
        ? {
            content: reflection.content,
            rating: reflection.rating,
            recordedAt: reflection.recordedAt,
          }
        : null,
      notes: notes
        ? {
            content: notes.content,
            updatedAt: notes.updatedAt,
          }
        : null,
    };
  }

  static toDomain(doc: LearningSessionDocument): LearningSession {
    const aggregate = Object.create(LearningSession.prototype) as LearningSession;

    (aggregate as any).sessionId = SessionId.create(doc._id);
    (aggregate as any).goalId = GoalId.create(doc.goalId);
    (aggregate as any).roadmapId = RoadmapId.create(doc.roadmapId);
    (aggregate as any).learnerId = LearnerId.create(doc.learnerId);
    (aggregate as any).assessmentId = doc.assessmentId
      ? AssessmentId.create(doc.assessmentId)
      : null;
    (aggregate as any).status = SessionStatus.create(doc.status);
    (aggregate as any).aggregateVersion = doc.aggregateVersion;
    (aggregate as any).pendingEvents = [];

    (aggregate as any).activities = doc.activities.map(
      (a) =>
        new LearningActivity(
          a.id,
          ActivityType.create(a.type),
          a.status as any,
          a.startedAt ? new Date(a.startedAt) : null,
          a.endedAt ? new Date(a.endedAt) : null,
          a.timeSpent,
        ),
    );

    (aggregate as any).tasks = doc.tasks.map(
      (t) =>
        new SessionTask(
          t.id,
          t.title,
          t.completed,
          t.completedAt ? new Date(t.completedAt) : null,
          SkillId.create(t.skillId),
        ),
    );

    (aggregate as any).evidence = doc.evidence.map(
      (e) =>
        new EvidenceRecord(
          e.id,
          e.completedTasks,
          e.timeSpent,
          e.completionRate,
          e.interruptions,
          e.revisionCount,
          e.focusScore,
          e.engagementScore,
          new Date(e.recordedAt),
        ),
    );

    (aggregate as any).progress = new SessionProgress(
      doc.progress.completedTasksCount,
      doc.progress.totalTasksCount,
      doc.progress.completionRate,
      new Date(doc.progress.lastUpdatedAt),
    );

    (aggregate as any).timers = doc.timers.map(
      (t) =>
        new StudyTimer(
          t.id,
          new Date(t.startedAt),
          t.pausedAt ? new Date(t.pausedAt) : null,
          t.elapsedSeconds,
          t.interruptions,
        ),
    );

    (aggregate as any).history = doc.history.map(
      (h) => new SessionHistory(SessionStatus.create(h.status), new Date(h.updatedAt), h.reason),
    );

    (aggregate as any).reflection = doc.reflection
      ? new SessionReflection(
          doc.reflection.content,
          doc.reflection.rating,
          new Date(doc.reflection.recordedAt),
        )
      : null;

    (aggregate as any).notes = doc.notes
      ? new SessionNotes(doc.notes.content, new Date(doc.notes.updatedAt))
      : null;

    return aggregate;
  }
}
