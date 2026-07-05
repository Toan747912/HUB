import { MetricsService } from '../../../../infrastructure/observability/metrics.service';
import { CompletedExecutionInput, Experience } from '../../domain/experience';
import { ExecutionPattern } from '../../domain/execution-pattern';
import { FeedbackEvent } from '../../domain/feedback-event';
import { KnowledgeItem } from '../../domain/knowledge-item';
import { LearningRecord } from '../../domain/learning-record';
import { Recommendation } from '../../domain/recommendation';
import { ILearningRepository } from '../../interfaces/learning.interface';
import { ExperienceExtractorService } from '../experience-extractor.service';
import { FeedbackService } from '../feedback.service';
import { KnowledgeBuilderService } from '../knowledge-builder.service';
import { LearningService } from '../learning.service';
import { PatternDetectorService } from '../pattern-detector.service';
import { RecommendationEngineService } from '../recommendation-engine.service';

function input(overrides: Partial<CompletedExecutionInput> = {}): CompletedExecutionInput {
  return {
    workflowId: 'workflow-1',
    goal: 'goal',
    sourceType: 'coordination',
    status: 'success',
    ...overrides,
  };
}

const experience: Experience = {
  experienceId: 'exp-1',
  workflowId: 'workflow-1',
  goal: 'goal',
  sourceType: 'coordination',
  participants: [],
  roles: {},
  artifacts: [],
  messages: [],
  durationMs: 100,
  success: true,
  confidence: 0.5,
  errors: [],
  capturedAt: Date.now(),
};

const pattern: ExecutionPattern = {
  patternId: 'p1',
  category: 'successful_workflow',
  subject: 'workflow-1',
  description: 'd',
  confidence: 0.9,
  evidence: { experienceIds: ['exp-1'], occurrences: 1 },
  detectedAt: Date.now(),
};

const knowledgeItem: KnowledgeItem = {
  id: 'k1',
  type: 'SuggestedWorkflow',
  subject: 'workflow-1',
  description: 'd',
  confidence: 0.9,
  evidence: ['p1'],
  createdAt: Date.now(),
};

const recommendation: Recommendation = {
  id: 'r1',
  category: 'workflow',
  subject: 'workflow-1',
  description: 'd',
  confidence: 0.9,
  basedOnKnowledgeItemIds: ['k1'],
  createdAt: Date.now(),
};

const feedbackEvent: FeedbackEvent = {
  feedbackId: 'f1',
  learningRecordId: 'record-1',
  experienceId: 'exp-1',
  workflowId: 'workflow-1',
  recommendationIds: ['r1'],
  knowledgeItemCount: 1,
  patternCount: 1,
  recordedAt: Date.now(),
};

describe('LearningService', () => {
  let repository: jest.Mocked<ILearningRepository>;
  let extractor: jest.Mocked<Pick<ExperienceExtractorService, 'extract'>>;
  let patternDetector: jest.Mocked<Pick<PatternDetectorService, 'detect'>>;
  let knowledgeBuilder: jest.Mocked<Pick<KnowledgeBuilderService, 'build'>>;
  let recommendationEngine: jest.Mocked<Pick<RecommendationEngineService, 'generate'>>;
  let feedback: jest.Mocked<Pick<FeedbackService, 'buildFeedbackEvent'>>;
  let service: LearningService;

  beforeEach(() => {
    repository = {
      saveLearningRecord: jest.fn(),
      listRecentLearningRecords: jest.fn().mockResolvedValue([]),
      findLearningRecordsByWorkflow: jest.fn(),
      saveExecutionPatterns: jest.fn().mockResolvedValue([pattern]),
      saveKnowledgeItems: jest.fn().mockResolvedValue([knowledgeItem]),
      saveRecommendations: jest.fn().mockResolvedValue([recommendation]),
      persistLearningCycle: jest.fn(),
      findKnowledgeItems: jest.fn(),
      findRecommendations: jest.fn(),
    };
    extractor = { extract: jest.fn().mockReturnValue(experience) };
    patternDetector = { detect: jest.fn().mockReturnValue([pattern]) };
    knowledgeBuilder = { build: jest.fn().mockReturnValue([knowledgeItem]) };
    recommendationEngine = { generate: jest.fn().mockReturnValue([recommendation]) };
    feedback = { buildFeedbackEvent: jest.fn().mockReturnValue(feedbackEvent) };

    repository.saveLearningRecord.mockImplementation(async (record) => record);
    repository.persistLearningCycle.mockImplementation(async (patterns, knowledgeItems, recommendations, record) => {
      await repository.saveExecutionPatterns(patterns);
      await repository.saveKnowledgeItems(knowledgeItems);
      await repository.saveRecommendations(recommendations);
      return repository.saveLearningRecord(record);
    });

    service = new LearningService(
      repository,
      extractor as unknown as ExperienceExtractorService,
      patternDetector as unknown as PatternDetectorService,
      knowledgeBuilder as unknown as KnowledgeBuilderService,
      recommendationEngine as unknown as RecommendationEngineService,
      feedback as unknown as FeedbackService,
    );
  });

  it('runs the full pipeline in order and persists an additive LearningRecord', async () => {
    const record = await service.runCycle(input());

    expect(extractor.extract).toHaveBeenCalledWith(input());
    expect(repository.listRecentLearningRecords).toHaveBeenCalled();
    expect(patternDetector.detect).toHaveBeenCalledWith([experience]);
    expect(knowledgeBuilder.build).toHaveBeenCalledWith([pattern]);
    expect(recommendationEngine.generate).toHaveBeenCalledWith([knowledgeItem]);
    expect(repository.saveExecutionPatterns).toHaveBeenCalledWith([pattern]);
    expect(repository.saveKnowledgeItems).toHaveBeenCalledWith([knowledgeItem]);
    expect(repository.saveRecommendations).toHaveBeenCalledWith([recommendation]);
    expect(feedback.buildFeedbackEvent).toHaveBeenCalledWith(
      expect.any(String),
      experience,
      [pattern],
      [knowledgeItem],
      [recommendation],
    );
    expect(repository.saveLearningRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        experience,
        patternIds: ['p1'],
        knowledgeItemIds: ['k1'],
        recommendationIds: ['r1'],
        feedback: feedbackEvent,
      }),
    );
    expect(record.experience).toEqual(experience);
  });

  it('folds prior LearningRecords into pattern detection so trends span cycles', async () => {
    const priorRecord: LearningRecord = {
      recordId: 'record-0',
      experience: { ...experience, experienceId: 'exp-0' },
      patternIds: [],
      knowledgeItemIds: [],
      recommendationIds: [],
      feedback: feedbackEvent,
      createdAt: Date.now() - 1000,
    };
    repository.listRecentLearningRecords.mockResolvedValue([priorRecord]);

    await service.runCycle(input());

    expect(patternDetector.detect).toHaveBeenCalledWith([priorRecord.experience, experience]);
  });

  it('propagates errors from downstream stages without persisting a partial record', async () => {
    repository.listRecentLearningRecords.mockRejectedValue(new Error('mongo down'));

    await expect(service.runCycle(input())).rejects.toThrow('mongo down');
    expect(repository.saveLearningRecord).not.toHaveBeenCalled();
  });

  it('works end to end with the real MetricsService wired in (registers new metric names onto its registry)', async () => {
    const metrics = new MetricsService();
    const withMetrics = new LearningService(
      repository,
      extractor as unknown as ExperienceExtractorService,
      patternDetector as unknown as PatternDetectorService,
      knowledgeBuilder as unknown as KnowledgeBuilderService,
      recommendationEngine as unknown as RecommendationEngineService,
      feedback as unknown as FeedbackService,
      undefined,
      metrics,
    );

    await withMetrics.runCycle(input());

    const metricsText = await metrics.getMetricsText();
    expect(metricsText).toContain('learning_total');
    expect(metricsText).toContain('experience_total');
    expect(metricsText).toContain('pattern_total');
    expect(metricsText).toContain('knowledge_total');
    expect(metricsText).toContain('recommendation_total');
    expect(metricsText).toContain('learning_duration_ms');
  });
});
