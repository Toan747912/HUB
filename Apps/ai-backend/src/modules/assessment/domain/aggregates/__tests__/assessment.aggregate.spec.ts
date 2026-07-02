import { AssessmentId, GoalId, LearnerId, RoadmapId } from '../../../../../shared/domain/identifiers';
import { AssessmentEngine } from '../../engine/assessment.engine';
import { AssessmentInput } from '../../engine/assessment-engine.types';
import { Assessment } from '../assessment.aggregate';

const context = { traceId: 't', correlationId: 'c', causationId: 'ca' };
const engine = new AssessmentEngine();

const baseInput: AssessmentInput = {
  goalId: 'goal-1',
  roadmapId: 'roadmap-1',
  learnerId: 'learner-1',
  roadmapCompletionRatio: 95,
  tasks: [{ id: 't1', skillArea: 'Solid', completed: true, estimatedDurationDays: 2, actualDurationDays: 2 }],
  revisionCount: 0,
  previousRuns: []
};

const makeAssessment = (): Assessment =>
  Assessment.create(
    {
      assessmentId: AssessmentId.create('assessment-1'),
      goalId: GoalId.create('goal-1'),
      roadmapId: RoadmapId.create('roadmap-1'),
      learnerId: LearnerId.create('learner-1')
    },
    context
  );

describe('Assessment aggregate', () => {
  it('creates a DRAFT assessment and emits AssessmentCreated', () => {
    const assessment = makeAssessment();
    expect(assessment.getStatus()).toBe('DRAFT');
    expect(assessment.getHistory()).toHaveLength(1);
    expect(assessment.getHistory()[0].reason).toBe('CREATED');

    const events = assessment.pullEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('AssessmentCreated');
  });

  it('run() transitions DRAFT -> COMPLETED, stores the result, and emits AssessmentCompleted + CompetencyUpdated', () => {
    const assessment = makeAssessment();
    assessment.pullEvents();

    const computation = engine.evaluate(baseInput);
    assessment.run(computation, context, assessment.getAggregateVersion());

    expect(assessment.getStatus()).toBe('COMPLETED');
    expect(assessment.getLatestResult()).not.toBeNull();
    expect(assessment.getLatestResult()!.confidenceScore).toBe(computation.confidenceScore);

    const events = assessment.pullEvents();
    expect(events.map((e) => e.type)).toEqual(['AssessmentCompleted', 'CompetencyUpdated']);
  });

  it('run() emits KnowledgeGapDetected only when gaps exist', () => {
    const assessment = makeAssessment();
    assessment.pullEvents();

    const gapInput: AssessmentInput = {
      ...baseInput,
      tasks: [{ id: 't1', skillArea: 'Weak', completed: false, estimatedDurationDays: 2 }]
    };
    const computation = engine.evaluate(gapInput);
    assessment.run(computation, context, assessment.getAggregateVersion());

    const events = assessment.pullEvents();
    expect(events.map((e) => e.type)).toEqual(['AssessmentCompleted', 'CompetencyUpdated', 'KnowledgeGapDetected']);
  });

  it('run() can be repeated while COMPLETED, appending history each time (deterministic outputs, no data loss)', () => {
    const assessment = makeAssessment();
    assessment.pullEvents();

    const computation1 = engine.evaluate(baseInput);
    assessment.run(computation1, context, assessment.getAggregateVersion());
    assessment.pullEvents();

    const computation2 = engine.evaluate({ ...baseInput, roadmapCompletionRatio: 50 });
    assessment.run(computation2, context, assessment.getAggregateVersion());

    expect(assessment.getStatus()).toBe('COMPLETED');
    expect(assessment.getHistory()).toHaveLength(3); // CREATED, RUN, RUN
    expect(assessment.getHistory().map((h) => h.reason)).toEqual(['CREATED', 'RUN', 'RUN']);
    expect(assessment.getLatestResult()!.confidenceScore).toBe(computation2.confidenceScore);
  });

  it('rejects a stale expectedVersion (optimistic concurrency)', () => {
    const assessment = makeAssessment();
    assessment.pullEvents();
    expect(() => assessment.run(engine.evaluate(baseInput), context, 999)).toThrow();
  });

  it('approve() requires a prior run and transitions COMPLETED -> APPROVED', () => {
    const assessment = makeAssessment();
    expect(() => assessment.approve(context, assessment.getAggregateVersion())).toThrow();

    assessment.run(engine.evaluate(baseInput), context, assessment.getAggregateVersion());
    assessment.approve(context, assessment.getAggregateVersion());

    expect(assessment.getStatus()).toBe('APPROVED');
    expect(assessment.getHistory().map((h) => h.reason)).toEqual(['CREATED', 'RUN', 'APPROVED']);
  });

  it('locks the assessment against further run() once APPROVED or ARCHIVED', () => {
    const assessment = makeAssessment();
    assessment.run(engine.evaluate(baseInput), context, assessment.getAggregateVersion());
    assessment.approve(context, assessment.getAggregateVersion());

    expect(() => assessment.run(engine.evaluate(baseInput), context, assessment.getAggregateVersion())).toThrow();
  });

  it('archive() transitions to ARCHIVED and emits AssessmentArchived, from DRAFT/COMPLETED/APPROVED', () => {
    const assessment = makeAssessment();
    assessment.pullEvents();
    assessment.archive(context, assessment.getAggregateVersion());

    expect(assessment.getStatus()).toBe('ARCHIVED');
    const events = assessment.pullEvents();
    expect(events[0].type).toBe('AssessmentArchived');
    expect(() => assessment.run(engine.evaluate(baseInput), context, assessment.getAggregateVersion())).toThrow();
  });
});
