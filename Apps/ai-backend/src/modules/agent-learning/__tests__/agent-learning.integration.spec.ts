import { ExecutionPattern } from '../domain/execution-pattern';
import { CompletedExecutionInput } from '../domain/experience';
import { KnowledgeItem } from '../domain/knowledge-item';
import { LearningRecord } from '../domain/learning-record';
import { Recommendation, RecommendationCategory } from '../domain/recommendation';
import { ExperienceExtractorService } from '../application/experience-extractor.service';
import { FeedbackService } from '../application/feedback.service';
import { KnowledgeBuilderService } from '../application/knowledge-builder.service';
import { LearningService } from '../application/learning.service';
import { PatternDetectorService } from '../application/pattern-detector.service';
import { RecommendationEngineService } from '../application/recommendation-engine.service';
import { ILearningRepository, KnowledgeItemQuery, RecommendationQuery } from '../interfaces/learning.interface';

/**
 * In-memory stand-in for MongoLearningRepository, following the same
 * pattern agent-collaboration.integration.spec.ts uses for Memory/Message
 * Bus repositories: this test exercises the real pipeline services wired
 * together exactly as AgentLearningModule wires them, swapping only the
 * Mongo-backed repository for an in-process one.
 */
class InMemoryLearningRepository implements ILearningRepository {
  readonly learningRecords: LearningRecord[] = [];
  readonly patterns: ExecutionPattern[] = [];
  readonly knowledgeItems: KnowledgeItem[] = [];
  readonly recommendations: Recommendation[] = [];

  async saveLearningRecord(record: LearningRecord): Promise<LearningRecord> {
    this.learningRecords.push(record);
    return record;
  }

  async listRecentLearningRecords(limit: number): Promise<LearningRecord[]> {
    return [...this.learningRecords].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  }

  async findLearningRecordsByWorkflow(workflowId: string, limit: number): Promise<LearningRecord[]> {
    return this.learningRecords.filter((r) => r.experience.workflowId === workflowId).slice(0, limit);
  }

  async saveExecutionPatterns(patterns: ExecutionPattern[]): Promise<ExecutionPattern[]> {
    this.patterns.push(...patterns);
    return patterns;
  }

  async saveKnowledgeItems(items: KnowledgeItem[]): Promise<KnowledgeItem[]> {
    this.knowledgeItems.push(...items);
    return items;
  }

  async saveRecommendations(recommendations: Recommendation[]): Promise<Recommendation[]> {
    this.recommendations.push(...recommendations);
    return recommendations;
  }

  async persistLearningCycle(
    patterns: ExecutionPattern[],
    knowledgeItems: KnowledgeItem[],
    recommendations: Recommendation[],
    record: LearningRecord,
  ): Promise<LearningRecord> {
    await this.saveExecutionPatterns(patterns);
    await this.saveKnowledgeItems(knowledgeItems);
    await this.saveRecommendations(recommendations);
    return this.saveLearningRecord(record);
  }

  async findKnowledgeItems(filter: KnowledgeItemQuery): Promise<KnowledgeItem[]> {
    return this.knowledgeItems.filter((item) => (filter.type ? item.type === filter.type : true));
  }

  async findRecommendations(filter: RecommendationQuery): Promise<Recommendation[]> {
    return this.recommendations.filter((r) => (filter.category ? r.category === filter.category : true));
  }
}

/**
 * Shapes a completed collaboration/coordination session the way a caller
 * outside this module would, before handing it to LearningService — mirrors
 * CollaborationSession/CoordinationResult fields (see
 * agent-collaboration/domain/collaboration-session.ts) without importing
 * that module.
 */
function completedSession(overrides: Partial<CompletedExecutionInput> = {}): CompletedExecutionInput {
  return {
    workflowId: 'ship-feature-workflow',
    goal: 'Decide whether to ship the feature',
    sourceType: 'collaboration',
    status: 'success',
    participants: ['researcher-agent', 'analyst-agent'],
    roles: { Researcher: 'researcher-agent', Analyst: 'analyst-agent' },
    artifacts: [
      { artifactId: 'a-1', type: 'research_notes', producedBy: 'Researcher' },
      { artifactId: 'a-2', type: 'summary', producedBy: 'Analyst' },
    ],
    messages: ['researcher-agent: findings ready', 'analyst-agent: approved'],
    startedAt: Date.now() - 500,
    endedAt: Date.now(),
    confidence: 0.9,
    consensus: { strategy: 'Majority', outcome: 'resolved', agreementScore: 0.95 },
    plannerCapability: 'discovery_planner',
    ...overrides,
  };
}

describe('agent-learning integration (CompletedExecution -> Experience -> Pattern -> Knowledge -> Recommendation -> Feedback)', () => {
  let repository: InMemoryLearningRepository;
  let learningService: LearningService;
  let feedbackService: FeedbackService;

  beforeEach(() => {
    repository = new InMemoryLearningRepository();
    const extractor = new ExperienceExtractorService();
    const patternDetector = new PatternDetectorService();
    const knowledgeBuilder = new KnowledgeBuilderService();
    const recommendationEngine = new RecommendationEngineService();
    feedbackService = new FeedbackService(repository);
    learningService = new LearningService(
      repository,
      extractor,
      patternDetector,
      knowledgeBuilder,
      recommendationEngine,
      feedbackService,
    );
  });

  it('learns from a single completed collaboration: produces an Experience, patterns, knowledge, recommendations, and a closing FeedbackEvent', async () => {
    const record = await learningService.runCycle(completedSession());

    expect(record.experience.workflowId).toBe('ship-feature-workflow');
    expect(record.experience.success).toBe(true);
    expect(record.experience.consensus?.outcome).toBe('resolved');

    expect(repository.patterns.length).toBeGreaterThan(0);
    expect(repository.knowledgeItems.length).toBeGreaterThan(0);
    expect(repository.recommendations.length).toBeGreaterThan(0);

    expect(record.feedback.learningRecordId).toBe(record.recordId);
    expect(record.feedback.experienceId).toBe(record.experience.experienceId);
    expect(record.feedback.recommendationIds).toEqual(record.recommendationIds);

    // Recommendations are read-only advisory data: nothing about running the
    // pipeline mutates the input session or triggers a second execution.
    const recommendations = await feedbackService.getRecommendations();
    expect(recommendations.length).toBe(record.recommendationIds.length);
  });

  it('detects cross-cycle patterns once the same workflow has run multiple times, and never rewrites a past LearningRecord', async () => {
    const first = await learningService.runCycle(completedSession());
    const second = await learningService.runCycle(completedSession());
    const third = await learningService.runCycle(completedSession({ status: 'failure', errors: ['timeout'] }));

    expect(repository.learningRecords).toHaveLength(3);
    expect(repository.learningRecords.map((r) => r.recordId)).toEqual([
      first.recordId,
      second.recordId,
      third.recordId,
    ]);
    // Additive-only: the first two records are untouched by the third cycle.
    expect(repository.learningRecords[0]).toBe(first);
    expect(repository.learningRecords[1]).toBe(second);

    const successPattern = repository.patterns.find(
      (p) => p.category === 'successful_workflow' && p.subject === 'ship-feature-workflow',
    );
    expect(successPattern).toBeDefined();

    const roleEffectivenessKnowledge = repository.knowledgeItems.find((k) => k.type === 'RecommendedAgentRole');
    expect(roleEffectivenessKnowledge).toBeDefined();

    const workflowRecommendation = repository.recommendations.find(
      (r): r is Recommendation & { category: RecommendationCategory } => r.category === 'workflow',
    );
    expect(workflowRecommendation).toBeDefined();
  });

  it('exposes distilled knowledge and recommendations through the read-only IKnowledgeProvider surface', async () => {
    await learningService.runCycle(completedSession());
    await learningService.runCycle(completedSession());

    const suggestedWorkflows = await feedbackService.getKnowledgeItems({ type: 'SuggestedWorkflow' });
    expect(suggestedWorkflows.length).toBeGreaterThan(0);

    const workflowRecommendations = await feedbackService.getRecommendations({ category: 'workflow' });
    expect(workflowRecommendations.length).toBeGreaterThan(0);
  });
});
