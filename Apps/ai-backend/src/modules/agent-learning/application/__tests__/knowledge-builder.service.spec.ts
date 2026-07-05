import { ExecutionPattern, PatternCategory } from '../../domain/execution-pattern';
import { KnowledgeItemType } from '../../domain/knowledge-item';
import { KnowledgeBuilderService } from '../knowledge-builder.service';

function pattern(overrides: Partial<ExecutionPattern> = {}): ExecutionPattern {
  return {
    patternId: 'pattern-1',
    category: 'successful_workflow',
    subject: 'workflow-1',
    description: 'description',
    confidence: 0.9,
    evidence: { experienceIds: ['exp-1'], occurrences: 3 },
    detectedAt: Date.now(),
    ...overrides,
  };
}

describe('KnowledgeBuilderService', () => {
  let service: KnowledgeBuilderService;

  beforeEach(() => {
    service = new KnowledgeBuilderService();
  });

  it('returns no knowledge items for an empty pattern set', () => {
    expect(service.build([])).toEqual([]);
  });

  it.each<[PatternCategory, KnowledgeItemType]>([
    ['successful_workflow', 'SuggestedWorkflow'],
    ['frequent_failure', 'CommonFailure'],
    ['tool_usage_trend', 'PreferredTool'],
    ['planner_confidence_trend', 'PreferredPlanner'],
    ['consensus_quality', 'OptimizationHint'],
    ['artifact_reuse', 'OptimizationHint'],
    ['role_effectiveness', 'RecommendedAgentRole'],
    ['message_bottleneck', 'OptimizationHint'],
  ])('maps pattern category %s to knowledge item type %s', (category, type) => {
    const [item] = service.build([pattern({ category })]);
    expect(item.type).toBe(type);
  });

  it('carries subject, description, and confidence through unchanged and traces evidence back to the patternId', () => {
    const [item] = service.build([pattern({ patternId: 'p-42', subject: 'wf-x', description: 'desc-x', confidence: 0.73 })]);

    expect(item.subject).toBe('wf-x');
    expect(item.description).toBe('desc-x');
    expect(item.confidence).toBe(0.73);
    expect(item.evidence).toEqual(['p-42']);
    expect(item.id).toEqual(expect.any(String));
  });
});
