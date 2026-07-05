import { BrainContext } from '../../../../infrastructure/ai-brain/brain-context.types';
import { TeachingAction, TeachingPlan } from './teaching-planning.types';

export const TEACHING_FALLBACK_VERSION = 'teaching-fallback-v1';

export class TeachingPlanningEngine {
  generate(context: BrainContext): TeachingPlan {
    const historyRefs = context.assessment?.refs ?? [];

    const actions: TeachingAction[] = [
      {
        actionType: 'roadmap-next-step-walkthrough',
        description: `Teach the next concept required to advance roadmap node "${context.roadmap.nodeId}" toward goal "${context.goal.title}".`,
        rationale: `Derived from roadmap node "${context.roadmap.nodeId}" (status: ${context.roadmap.status}) toward goal "${context.goal.title}".`,
      },
      {
        actionType: 'gap-focused-reteach',
        description: 'Reteach the concepts underlying open gaps identified by prior assessments.',
        rationale:
          historyRefs.length > 0
            ? `Derived from assessment history ${historyRefs.join(', ')}.`
            : 'Derived from recommendation state with no prior assessment history available.',
      },
      {
        actionType: 'discovery-aligned-explanation',
        description: 'Deliver an explanation styled to match the learner discovery profile.',
        rationale: `Derived from discovery profile "${context.discovery.profile}" and recommendation state "${context.recommendation.state}".`,
      },
    ];

    return {
      teachingId: `teaching-${context.userId}-${context.assembledAt}`,
      userId: context.userId,
      actions,
      primaryAction: actions[0].actionType,
      focusSummary: `Deterministic teaching plan (${TEACHING_FALLBACK_VERSION}) derived from goal "${context.goal.title}" and discovery profile "${context.discovery.profile}".`,
    };
  }
}
