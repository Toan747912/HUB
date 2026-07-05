import { Experience } from '../../domain/experience';
import { ILearningRepository } from '../../interfaces/learning.interface';
import { FeedbackService } from '../feedback.service';

function experience(overrides: Partial<Experience> = {}): Experience {
  return {
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
    ...overrides,
  };
}

describe('FeedbackService', () => {
  let repository: jest.Mocked<ILearningRepository>;
  let service: FeedbackService;

  beforeEach(() => {
    repository = {
      saveLearningRecord: jest.fn(),
      listRecentLearningRecords: jest.fn(),
      findLearningRecordsByWorkflow: jest.fn(),
      saveExecutionPatterns: jest.fn(),
      saveKnowledgeItems: jest.fn(),
      saveRecommendations: jest.fn(),
      persistLearningCycle: jest.fn(),
      findKnowledgeItems: jest.fn(),
      findRecommendations: jest.fn(),
    };
    service = new FeedbackService(repository);
  });

  it('buildFeedbackEvent closes the loop for a learning cycle with the right counts and ids', () => {
    const exp = experience();
    const event = service.buildFeedbackEvent(
      'record-1',
      exp,
      [
        { patternId: 'p1', category: 'successful_workflow', subject: 's', description: 'd', confidence: 1, evidence: { experienceIds: [], occurrences: 1 }, detectedAt: 1 },
      ],
      [
        { id: 'k1', type: 'SuggestedWorkflow', subject: 's', description: 'd', confidence: 1, evidence: [], createdAt: 1 },
      ],
      [
        { id: 'r1', category: 'workflow', subject: 's', description: 'd', confidence: 1, basedOnKnowledgeItemIds: ['k1'], createdAt: 1 },
      ],
    );

    expect(event.learningRecordId).toBe('record-1');
    expect(event.experienceId).toBe('exp-1');
    expect(event.workflowId).toBe('workflow-1');
    expect(event.recommendationIds).toEqual(['r1']);
    expect(event.knowledgeItemCount).toBe(1);
    expect(event.patternCount).toBe(1);
    expect(event.feedbackId).toEqual(expect.any(String));
  });

  it('getRecommendations delegates to the repository, defaulting to an empty filter', async () => {
    repository.findRecommendations.mockResolvedValue([]);

    await service.getRecommendations();

    expect(repository.findRecommendations).toHaveBeenCalledWith({});
  });

  it('getKnowledgeItems delegates to the repository with the given filter', async () => {
    repository.findKnowledgeItems.mockResolvedValue([]);

    await service.getKnowledgeItems({ type: 'PreferredTool' });

    expect(repository.findKnowledgeItems).toHaveBeenCalledWith({ type: 'PreferredTool' });
  });
});
