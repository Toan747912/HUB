import { ILearningSessionRepository } from '../contracts/learning-session-repository.contract';
import { LearningSession } from '../../domain/aggregates/learning-session.aggregate';
import { EvidenceRecord } from '../../domain/entities/evidence-record.entity';
import { GetLearningSessionQuery } from '../queries/get-learning-session.query';
import { GetLearningSessionsQuery } from '../queries/get-learning-sessions.query';
import { GetLearningAnalyticsQuery } from '../queries/get-learning-analytics.query';
import { GetEvidenceHistoryQuery } from '../queries/get-evidence-history.query';
import { LearningSessionDomainError } from '../../domain/errors/learning-session-domain.error';

export class LearningSessionQueryService {
  constructor(private readonly repository: ILearningSessionRepository) {}

  async getSession(query: GetLearningSessionQuery): Promise<LearningSession | null> {
    return this.repository.findById(query.sessionId);
  }

  async getSessions(query: GetLearningSessionsQuery): Promise<LearningSession[]> {
    if (query.learnerId) {
      return this.repository.findByLearnerId(query.learnerId);
    }
    return this.repository.findAll();
  }

  async getAnalytics(query: GetLearningAnalyticsQuery): Promise<{
    sessionId: string;
    status: string;
    focusScore: number;
    engagementScore: number;
    consistencyScore: number;
    completionScore: number;
    sessionEffectiveness: number;
    totalTimeSpent: number;
    completedTasksCount: number;
    totalTasksCount: number;
    completionRate: number;
  }> {
    const session = await this.repository.findById(query.sessionId);
    if (!session) {
      throw new LearningSessionDomainError(
        'SESSION_NOT_FOUND',
        `Session ${query.sessionId} not found`,
      );
    }

    let totalTimeSpent = 0;
    session.getTimers().forEach((t) => {
      totalTimeSpent += t.getCurrentElapsedSeconds();
    });

    const progress = session.getProgress();

    return {
      sessionId: session.getId().toString(),
      status: session.getStatus(),
      focusScore: session.calculateFocusScore(),
      engagementScore: session.calculateEngagementScore(),
      consistencyScore: session.calculateConsistencyScore(),
      completionScore: session.calculateCompletionScore(),
      sessionEffectiveness: session.calculateSessionEffectiveness(),
      totalTimeSpent,
      completedTasksCount: progress.completedTasksCount,
      totalTasksCount: progress.totalTasksCount,
      completionRate: progress.completionRate,
    };
  }

  async getEvidenceHistory(query: GetEvidenceHistoryQuery): Promise<EvidenceRecord[]> {
    const session = await this.repository.findById(query.sessionId);
    if (!session) {
      throw new LearningSessionDomainError(
        'SESSION_NOT_FOUND',
        `Session ${query.sessionId} not found`,
      );
    }
    return session.getEvidence();
  }
}
