import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../infrastructure/persistence/prisma.service';
import { ExecutionPattern } from '../../domain/execution-pattern';
import { Experience } from '../../domain/experience';
import { FeedbackEvent } from '../../domain/feedback-event';
import { KnowledgeItem } from '../../domain/knowledge-item';
import { LearningRecord } from '../../domain/learning-record';
import { Recommendation } from '../../domain/recommendation';
import { PrismaLearningRepository } from '../prisma-learning.repository';

function buildExperience(overrides: Partial<Experience> = {}): Experience {
  return {
    experienceId: randomUUID(),
    workflowId: 'workflow-1',
    goal: 'ship the feature',
    sourceType: 'coordination',
    participants: ['agent-a'],
    roles: { Researcher: 'agent-a' },
    artifacts: [],
    messages: [],
    durationMs: 100,
    success: true,
    confidence: 0.8,
    errors: [],
    capturedAt: Date.now(),
    ...overrides,
  };
}

function buildFeedback(overrides: Partial<FeedbackEvent> = {}): FeedbackEvent {
  return {
    feedbackId: randomUUID(),
    learningRecordId: 'record-1',
    experienceId: 'exp-1',
    workflowId: 'workflow-1',
    recommendationIds: [],
    knowledgeItemCount: 0,
    patternCount: 0,
    recordedAt: Date.now(),
    ...overrides,
  };
}

function buildLearningRecord(overrides: Partial<LearningRecord> = {}): LearningRecord {
  const experience = buildExperience();
  return {
    recordId: randomUUID(),
    experience,
    patternIds: [],
    knowledgeItemIds: [],
    recommendationIds: [],
    feedback: buildFeedback({ experienceId: experience.experienceId, workflowId: experience.workflowId }),
    createdAt: Date.now(),
    ...overrides,
  };
}

function buildPattern(overrides: Partial<ExecutionPattern> = {}): ExecutionPattern {
  return {
    patternId: randomUUID(),
    category: 'successful_workflow',
    subject: 'workflow-1',
    description: 'description',
    confidence: 0.9,
    evidence: { experienceIds: ['exp-1'], occurrences: 3 },
    detectedAt: Date.now(),
    ...overrides,
  };
}

function buildKnowledgeItem(overrides: Partial<KnowledgeItem> = {}): KnowledgeItem {
  return {
    id: randomUUID(),
    type: 'SuggestedWorkflow',
    subject: 'workflow-1',
    description: 'description',
    confidence: 0.9,
    evidence: ['pattern-1'],
    createdAt: Date.now(),
    ...overrides,
  };
}

function buildRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: randomUUID(),
    category: 'workflow',
    subject: 'workflow-1',
    description: 'description',
    confidence: 0.9,
    basedOnKnowledgeItemIds: ['knowledge-1'],
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('PrismaLearningRepository — integration', () => {
  let prisma: PrismaService;
  let repository: PrismaLearningRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new PrismaLearningRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await Promise.all([
      prisma.learningRecord.deleteMany({}),
      prisma.executionPattern.deleteMany({}),
      prisma.knowledgeItem.deleteMany({}),
      prisma.agentLearningRecommendation.deleteMany({}),
    ]);
  });

  it('saves a LearningRecord and lists it back, most recent first', async () => {
    const first = buildLearningRecord();
    await repository.saveLearningRecord(first);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = buildLearningRecord();
    await repository.saveLearningRecord(second);

    const recent = await repository.listRecentLearningRecords(10);

    expect(recent).toHaveLength(2);
    expect(recent[0].recordId).toBe(second.recordId);
    expect(recent[1].recordId).toBe(first.recordId);
    expect(recent[0].experience.workflowId).toBe('workflow-1');
  });

  it('findLearningRecordsByWorkflow filters to the given workflowId', async () => {
    await repository.saveLearningRecord(buildLearningRecord({ experience: buildExperience({ workflowId: 'wf-a' }) }));
    await repository.saveLearningRecord(buildLearningRecord({ experience: buildExperience({ workflowId: 'wf-b' }) }));

    const found = await repository.findLearningRecordsByWorkflow('wf-a', 10);

    expect(found).toHaveLength(1);
    expect(found[0].experience.workflowId).toBe('wf-a');
  });

  it('saves ExecutionPatterns and never mutates a previously saved one on a later cycle', async () => {
    const pattern = buildPattern();
    await repository.saveExecutionPatterns([pattern]);

    const laterPattern = buildPattern({ subject: 'workflow-1', confidence: 0.4 });
    await repository.saveExecutionPatterns([laterPattern]);

    const count = await prisma.executionPattern.count({});
    expect(count).toBe(2);
  });

  it('saves and queries KnowledgeItems by type and minimum confidence', async () => {
    await repository.saveKnowledgeItems([
      buildKnowledgeItem({ type: 'SuggestedWorkflow', confidence: 0.9 }),
      buildKnowledgeItem({ type: 'PreferredTool', confidence: 0.3 }),
    ]);

    const highConfidenceWorkflowItems = await repository.findKnowledgeItems({
      type: 'SuggestedWorkflow',
      minConfidence: 0.5,
    });

    expect(highConfidenceWorkflowItems).toHaveLength(1);
    expect(highConfidenceWorkflowItems[0].type).toBe('SuggestedWorkflow');
  });

  it('saves and queries Recommendations by category', async () => {
    await repository.saveRecommendations([
      buildRecommendation({ category: 'workflow' }),
      buildRecommendation({ category: 'tool' }),
    ]);

    const workflowRecommendations = await repository.findRecommendations({ category: 'workflow' });

    expect(workflowRecommendations).toHaveLength(1);
    expect(workflowRecommendations[0].category).toBe('workflow');
  });

  it('saveExecutionPatterns/saveKnowledgeItems/saveRecommendations are no-ops for an empty array', async () => {
    await expect(repository.saveExecutionPatterns([])).resolves.toEqual([]);
    await expect(repository.saveKnowledgeItems([])).resolves.toEqual([]);
    await expect(repository.saveRecommendations([])).resolves.toEqual([]);
  });

  describe('persistLearningCycle', () => {
    it('saves patterns, knowledge, recommendations, and the learning record together', async () => {
      const pattern = buildPattern();
      const knowledgeItem = buildKnowledgeItem();
      const recommendation = buildRecommendation();
      const record = buildLearningRecord({
        patternIds: [pattern.patternId],
        knowledgeItemIds: [knowledgeItem.id],
        recommendationIds: [recommendation.id],
      });

      const saved = await repository.persistLearningCycle([pattern], [knowledgeItem], [recommendation], record);

      expect(saved.recordId).toBe(record.recordId);
      expect(await prisma.executionPattern.count({ where: { id: pattern.patternId } })).toBe(1);
      expect(await prisma.knowledgeItem.count({ where: { id: knowledgeItem.id } })).toBe(1);
      expect(await prisma.agentLearningRecommendation.count({ where: { id: recommendation.id } })).toBe(1);
      expect(await prisma.learningRecord.count({ where: { id: record.recordId } })).toBe(1);
    });

    it('rolls back every write when the final learning record insert fails', async () => {
      const pattern = buildPattern();
      const knowledgeItem = buildKnowledgeItem();
      const recommendation = buildRecommendation();
      const record = buildLearningRecord();

      // Force saveLearningRecord to fail by pre-inserting a document with the
      // same id, so the duplicate-key error happens after the other three
      // writes have already run inside the transaction.
      await prisma.learningRecord.create({
        data: { id: record.recordId, experience: {}, feedback: {}, workflowId: 'wf' },
      });

      await expect(
        repository.persistLearningCycle([pattern], [knowledgeItem], [recommendation], record),
      ).rejects.toThrow();

      expect(await prisma.executionPattern.count({ where: { id: pattern.patternId } })).toBe(0);
      expect(await prisma.knowledgeItem.count({ where: { id: knowledgeItem.id } })).toBe(0);
      expect(await prisma.agentLearningRecommendation.count({ where: { id: recommendation.id } })).toBe(0);
    });
  });
});
