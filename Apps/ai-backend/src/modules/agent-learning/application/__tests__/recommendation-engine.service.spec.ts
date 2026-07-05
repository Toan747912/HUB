import { KnowledgeItem, KnowledgeItemType } from '../../domain/knowledge-item';
import { RecommendationCategory } from '../../domain/recommendation';
import { RecommendationEngineService } from '../recommendation-engine.service';

function knowledgeItem(overrides: Partial<KnowledgeItem> = {}): KnowledgeItem {
  return {
    id: 'knowledge-1',
    type: 'SuggestedWorkflow',
    subject: 'workflow-1',
    description: 'description',
    confidence: 0.8,
    evidence: ['pattern-1'],
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('RecommendationEngineService', () => {
  let service: RecommendationEngineService;

  beforeEach(() => {
    service = new RecommendationEngineService();
  });

  it('returns no recommendations for an empty knowledge item set', () => {
    expect(service.generate([])).toEqual([]);
  });

  it.each<[KnowledgeItemType, RecommendationCategory]>([
    ['PreferredPlanner', 'planner'],
    ['PreferredTool', 'tool'],
    ['RecommendedAgentRole', 'role'],
    ['SuggestedWorkflow', 'workflow'],
    ['CommonFailure', 'execution'],
    ['OptimizationHint', 'execution'],
  ])('maps knowledge item type %s to recommendation category %s', (type, category) => {
    const [recommendation] = service.generate([knowledgeItem({ type })]);
    expect(recommendation.category).toBe(category);
  });

  it('carries confidence through unchanged and traces basedOnKnowledgeItemIds back to the source item', () => {
    const [recommendation] = service.generate([knowledgeItem({ id: 'k-9', confidence: 0.65 })]);

    expect(recommendation.confidence).toBe(0.65);
    expect(recommendation.basedOnKnowledgeItemIds).toEqual(['k-9']);
    expect(recommendation.id).toEqual(expect.any(String));
  });

  it('includes the knowledge item subject and description in the recommendation description', () => {
    const [recommendation] = service.generate([knowledgeItem({ subject: 'wf-x', description: 'because reasons' })]);

    expect(recommendation.subject).toBe('wf-x');
    expect(recommendation.description).toContain('wf-x');
    expect(recommendation.description).toContain('because reasons');
  });
});
