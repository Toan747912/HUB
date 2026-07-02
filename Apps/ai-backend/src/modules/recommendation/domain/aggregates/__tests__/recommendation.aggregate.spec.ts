import { AssessmentId, GoalId, LearnerId, RecommendationId, RoadmapId } from '../../../../../shared/domain/identifiers';
import { RecommendationEngine } from '../../engine/recommendation.engine';
import { RecommendationInput } from '../../engine/recommendation-engine.types';
import { Recommendation } from '../recommendation.aggregate';

const context = { traceId: 't', correlationId: 'c', causationId: 'ca' };
const engine = new RecommendationEngine();

const baseInput: RecommendationInput = {
  goalId: 'goal-1',
  roadmapId: 'roadmap-1',
  assessmentId: 'assessment-1',
  learnerId: 'learner-1',
  goalPriority: 'MEDIUM',
  goalDifficulty: 'INTERMEDIATE',
  targetDate: '2027-06-01T00:00:00.000Z',
  referenceDate: '2027-01-01T00:00:00.000Z',
  roadmapCompletionRatio: 60,
  revisionCount: 0,
  tasks: [{ id: 't1', skillId: 'Foundations', completed: false, order: 1, dependsOn: [], estimatedDurationDays: 3 }],
  competencies: [{ skillId: 'Foundations', score: 60, level: 'PROFICIENT' }],
  knowledgeGaps: [{ skillId: 'Foundations', weight: 'HIGH', reason: 'gap' }],
  confidenceScore: 70,
  readiness: 'NOT_READY'
};

const makeRecommendation = (): Recommendation => {
  const computation = engine.evaluate(baseInput);
  return Recommendation.create(
    {
      recommendationId: RecommendationId.create('rec-1'),
      goalId: GoalId.create('goal-1'),
      roadmapId: RoadmapId.create('roadmap-1'),
      assessmentId: AssessmentId.create('assessment-1'),
      learnerId: LearnerId.create('learner-1'),
      computation
    },
    context
  );
};

describe('Recommendation aggregate', () => {
  it('creates a GENERATED recommendation and emits RecommendationGenerated + LearningStrategyChanged', () => {
    const recommendation = makeRecommendation();
    expect(recommendation.getStatus()).toBe('GENERATED');
    expect(recommendation.getItems().length).toBeGreaterThan(0);
    expect(recommendation.getLearningStrategies().length).toBeGreaterThan(0);
    expect(recommendation.getHistory()).toHaveLength(1);
    expect(recommendation.getHistory()[0].reason).toBe('GENERATED');

    const events = recommendation.pullEvents();
    expect(events.map((e) => e.type)).toEqual(['RecommendationGenerated', 'LearningStrategyChanged']);
  });

  it('every RecommendationItem carries reason/scores/affected ids (explainability)', () => {
    const recommendation = makeRecommendation();
    for (const item of recommendation.getItems()) {
      expect(item.reason.summary.length).toBeGreaterThan(0);
      expect(item.reason.evidence.length).toBeGreaterThan(0);
      expect(item.affectedGoalId.toString()).toBe('goal-1');
      expect(item.affectedRoadmapId.toString()).toBe('roadmap-1');
      expect(item.affectedAssessmentId.toString()).toBe('assessment-1');
    }
  });

  it('approve() transitions GENERATED -> APPROVED and emits RecommendationApproved', () => {
    const recommendation = makeRecommendation();
    recommendation.pullEvents();

    recommendation.approve(context, recommendation.getAggregateVersion());
    expect(recommendation.getStatus()).toBe('APPROVED');
    expect(recommendation.getHistory().map((h) => h.reason)).toEqual(['GENERATED', 'APPROVED']);

    const events = recommendation.pullEvents();
    expect(events[0].type).toBe('RecommendationApproved');
  });

  it('reject() transitions GENERATED -> REJECTED and emits RecommendationRejected with a reason', () => {
    const recommendation = makeRecommendation();
    recommendation.pullEvents();

    recommendation.reject(context, 'Not aligned with learner preference', recommendation.getAggregateVersion());
    expect(recommendation.getStatus()).toBe('REJECTED');

    const events = recommendation.pullEvents();
    expect(events[0].type).toBe('RecommendationRejected');
    expect((events[0].payload as any).reason).toBe('Not aligned with learner preference');
  });

  it('cannot approve after rejecting, and cannot reject after approving (mutually exclusive terminal branches)', () => {
    const approved = makeRecommendation();
    approved.approve(context, approved.getAggregateVersion());
    expect(() => approved.reject(context, undefined, approved.getAggregateVersion())).toThrow();

    const rejected = makeRecommendation();
    rejected.reject(context, undefined, rejected.getAggregateVersion());
    expect(() => rejected.approve(context, rejected.getAggregateVersion())).toThrow();
  });

  it('archive() works from GENERATED, APPROVED, or REJECTED and emits RecommendationArchived', () => {
    const fromGenerated = makeRecommendation();
    fromGenerated.pullEvents();
    fromGenerated.archive(context, fromGenerated.getAggregateVersion());
    expect(fromGenerated.getStatus()).toBe('ARCHIVED');
    expect(fromGenerated.pullEvents()[0].type).toBe('RecommendationArchived');

    const fromApproved = makeRecommendation();
    fromApproved.approve(context, fromApproved.getAggregateVersion());
    fromApproved.archive(context, fromApproved.getAggregateVersion());
    expect(fromApproved.getStatus()).toBe('ARCHIVED');
  });

  it('rejects further transitions once ARCHIVED (terminal)', () => {
    const recommendation = makeRecommendation();
    recommendation.archive(context, recommendation.getAggregateVersion());
    expect(() => recommendation.approve(context, recommendation.getAggregateVersion())).toThrow();
    expect(() => recommendation.reject(context, undefined, recommendation.getAggregateVersion())).toThrow();
  });

  it('rejects a stale expectedVersion (optimistic concurrency)', () => {
    const recommendation = makeRecommendation();
    expect(() => recommendation.approve(context, 999)).toThrow();
  });

  it('history is append-only across the full lifecycle', () => {
    const recommendation = makeRecommendation();
    recommendation.approve(context, recommendation.getAggregateVersion());
    recommendation.archive(context, recommendation.getAggregateVersion());

    expect(recommendation.getHistory()).toHaveLength(3);
    expect(recommendation.getHistory().map((h) => h.reason)).toEqual(['GENERATED', 'APPROVED', 'ARCHIVED']);
    expect(recommendation.getHistory().map((h) => h.version)).toEqual([1, 2, 3]);
  });
});
