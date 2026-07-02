import { AssessmentId, GoalId, LearnerId, RoadmapId } from '../../../../../shared/domain/identifiers';
import { Assessment } from '../../../domain/aggregates/assessment.aggregate';
import { AssessmentResult } from '../../../domain/entities/assessment-result.entity';
import { AssessmentHistory, AssessmentHistoryReason } from '../../../domain/entities/assessment-history.entity';
import { Competency } from '../../../domain/entities/competency.entity';
import { KnowledgeGap } from '../../../domain/entities/knowledge-gap.entity';
import { SkillScore } from '../../../domain/entities/skill-score.entity';
import { AssessmentStatus } from '../../../domain/value-objects/assessment-status.vo';
import { AssessmentDocument } from '../documents/assessment.document';

export class AssessmentPersistenceMapper {
  static toDocument(assessment: Assessment): AssessmentDocument {
    const result = assessment.getLatestResult();

    return {
      _id: assessment.getId().toString(),
      goalId: assessment.getGoalId().toString(),
      roadmapId: assessment.getRoadmapId().toString(),
      learnerId: assessment.getLearnerId().toString(),
      status: assessment.getStatus(),
      aggregateVersion: assessment.getAggregateVersion(),
      latestResult: result
        ? {
            skillScores: result.skillScores.map((s) => ({
              skillArea: s.skillArea,
              rawScore: s.rawScore,
              taskCount: s.taskCount,
              completedTaskCount: s.completedTaskCount
            })),
            competencies: result.competencies.map((c) => ({ skillArea: c.skillArea, score: c.score, level: c.level })),
            knowledgeGaps: result.knowledgeGaps.map((g) => ({ id: g.id, skillArea: g.skillArea, weight: g.weight, reason: g.reason })),
            confidenceScore: result.confidenceScore,
            readiness: result.readiness,
            weakAreas: [...result.weakAreas],
            strongAreas: [...result.strongAreas],
            engineVersion: result.engineVersion,
            computedAt: result.computedAt
          }
        : null,
      history: assessment.getHistory().map((h) => ({
        version: h.version,
        reason: h.reason,
        engineVersion: h.engineVersion,
        confidenceScore: h.confidenceScore,
        readiness: h.readiness,
        gapCount: h.gapCount,
        createdAt: h.createdAt
      })),
      invalidatedAt: assessment.getInvalidatedAt(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // TypeScript private fields are compile-time only; direct property assignment
  // is the accepted reconstitution pattern when the aggregate has no static reconstruct factory.
  static toDomain(doc: AssessmentDocument): Assessment {
    const assessment = Object.create(Assessment.prototype) as Assessment;

    (assessment as any).assessmentId = AssessmentId.create(doc._id);
    (assessment as any).goalId = GoalId.create(doc.goalId);
    (assessment as any).roadmapId = RoadmapId.create(doc.roadmapId);
    (assessment as any).learnerId = LearnerId.create(doc.learnerId);
    (assessment as any).status = AssessmentStatus.create(doc.status);
    (assessment as any).aggregateVersion = doc.aggregateVersion;
    (assessment as any).pendingEvents = [];
    (assessment as any).invalidatedAt = doc.invalidatedAt ?? null;

    (assessment as any).latestResult = doc.latestResult
      ? new AssessmentResult(
          doc.latestResult.skillScores.map((s) => new SkillScore(s.skillArea, s.rawScore, s.taskCount, s.completedTaskCount)),
          doc.latestResult.competencies.map((c) => new Competency(c.skillArea, c.score, c.level)),
          doc.latestResult.knowledgeGaps.map((g) => new KnowledgeGap(g.id, g.skillArea, g.weight, g.reason)),
          doc.latestResult.confidenceScore,
          doc.latestResult.readiness as any,
          doc.latestResult.weakAreas,
          doc.latestResult.strongAreas,
          doc.latestResult.engineVersion,
          doc.latestResult.computedAt
        )
      : null;

    (assessment as any).history = doc.history.map(
      (h) =>
        new AssessmentHistory(
          h.version,
          h.reason as AssessmentHistoryReason,
          h.engineVersion,
          h.confidenceScore,
          h.readiness,
          h.gapCount,
          h.createdAt
        )
    );

    return assessment;
  }
}
