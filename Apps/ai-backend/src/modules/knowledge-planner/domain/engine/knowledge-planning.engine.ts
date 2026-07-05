import { BrainContext } from '../../../../infrastructure/ai-brain/brain-context.types';
import { KnowledgePlan, KnowledgeRecommendation } from './knowledge-planning.types';

export const KNOWLEDGE_FALLBACK_VERSION = 'knowledge-fallback-v1';

export class KnowledgePlanningEngine {
  generate(context: BrainContext): KnowledgePlan {
    const historyRefs = context.assessment?.refs ?? [];

    const recommendations: KnowledgeRecommendation[] = [
      {
        topic: context.goal.title,
        resourceType: 'roadmap-aligned-reading',
        rationale: `Derived from roadmap node "${context.roadmap.nodeId}" (status: ${context.roadmap.status}) toward goal "${context.goal.title}".`,
      },
      {
        topic: 'Targeted remediation',
        resourceType: 'assessment-driven-practice',
        rationale:
          historyRefs.length > 0
            ? `Derived from assessment history ${historyRefs.join(', ')}.`
            : 'Derived from recommendation state with no prior assessment history available.',
      },
      {
        topic: 'Discovery-aligned exploration',
        resourceType: 'discovery-profile-material',
        rationale: `Derived from discovery profile "${context.discovery.profile}" and recommendation state "${context.recommendation.state}".`,
      },
    ];

    return {
      knowledgeId: `knowledge-${context.userId}-${context.assembledAt}`,
      userId: context.userId,
      recommendations,
      primaryTopic: recommendations[0].topic,
      focusSummary: `Deterministic knowledge plan (${KNOWLEDGE_FALLBACK_VERSION}) derived from goal "${context.goal.title}" and discovery profile "${context.discovery.profile}".`,
    };
  }
}
