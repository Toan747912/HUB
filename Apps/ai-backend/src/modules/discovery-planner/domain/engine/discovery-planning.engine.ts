import { BrainContext } from '../../../../infrastructure/ai-brain/brain-context.types';
import { DiscoveryPlan, DiscoverySuggestion } from './discovery-planning.types';

export const DISCOVERY_FALLBACK_VERSION = 'discovery-fallback-v1';

/**
 * Deterministic, rule-based discovery planner. No LLM, no randomness: identical
 * BrainContext always yields an identical DiscoveryPlan (same shape and ids).
 * Used whenever the LLM path is unavailable or its output cannot be trusted.
 */
export class DiscoveryPlanningEngine {
  generate(context: BrainContext): DiscoveryPlan {
    const suggestions: DiscoverySuggestion[] = [
      {
        goalArea: context.goal.title,
        skillFocus: 'system-design',
        rationale: `Derived from discovery profile "${context.discovery.profile}" and current goal "${context.goal.title}".`,
      },
      {
        goalArea: 'Applied practice through recommendations',
        skillFocus: 'recommendation-driven-practice',
        rationale: `Derived from recommendation state "${context.recommendation.state}".`,
      },
    ];

    return {
      discoveryId: `discovery-${context.userId}-${context.assembledAt}`,
      userId: context.userId,
      suggestions,
      primaryFocus: suggestions[0].skillFocus,
      focusSummary: `Deterministic discovery (${DISCOVERY_FALLBACK_VERSION}) derived from profile "${context.discovery.profile}".`,
    };
  }
}
