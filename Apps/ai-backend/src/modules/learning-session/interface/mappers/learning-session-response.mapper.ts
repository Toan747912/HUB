import { LearningSession } from '../../domain/aggregates/learning-session.aggregate';

export class LearningSessionResponseMapper {
  toResponse(session: LearningSession): any {
    const progress = session.getProgress();
    const reflection = session.getReflection();
    const notes = session.getNotes();

    return {
      id: session.getId().toString(),
      goalId: session.getGoalId().toString(),
      roadmapId: session.getRoadmapId().toString(),
      assessmentId: session.getAssessmentId() ? session.getAssessmentId()!.toString() : null,
      learnerId: session.getLearnerId().toString(),
      status: session.getStatus(),
      aggregateVersion: session.getAggregateVersion(),
      activities: session.getActivities().map((a) => ({
        id: a.id,
        type: a.type.getValue(),
        status: a.status,
        startedAt: a.startedAt,
        endedAt: a.endedAt,
        timeSpent: a.timeSpent,
      })),
      tasks: session.getTasks().map((t) => ({
        id: t.id,
        title: t.title,
        completed: t.completed,
        completedAt: t.completedAt,
        skillId: t.skillId.toString(),
      })),
      evidence: session.getEvidence().map((e) => ({
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
      timers: session.getTimers().map((t) => ({
        id: t.id,
        startedAt: t.startedAt,
        pausedAt: t.pausedAt,
        elapsedSeconds: t.elapsedSeconds,
        interruptions: t.interruptions,
      })),
      history: session.getHistory().map((h) => ({
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

  toList(sessions: LearningSession[]): any[] {
    return sessions.map((s) => this.toResponse(s));
  }
}
