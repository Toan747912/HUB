import { BrainContext } from '../../../../infrastructure/ai-brain/brain-context.types';
import { EvidencePlan, EvidenceRequirement } from './evidence-planning.types';

export const EVIDENCE_FALLBACK_VERSION = 'evidence-fallback-v1';

export class EvidencePlanningEngine {
  generate(context: BrainContext): EvidencePlan {
    const historyRefs = context.assessment?.refs ?? [];

    const requirements: EvidenceRequirement[] = [
      {
        evidenceType: 'roadmap-checkpoint-submission',
        description: `Evidence that roadmap node "${context.roadmap.nodeId}" has been completed toward goal "${context.goal.title}".`,
        rationale: `Derived from roadmap node "${context.roadmap.nodeId}" (status: ${context.roadmap.status}) toward goal "${context.goal.title}".`,
      },
      {
        evidenceType: 'assessment-verification',
        description: 'Evidence resolving open gaps identified by prior assessments.',
        rationale:
          historyRefs.length > 0
            ? `Derived from assessment history ${historyRefs.join(', ')}.`
            : 'Derived from recommendation state with no prior assessment history available.',
      },
      {
        evidenceType: 'discovery-aligned-demonstration',
        description: 'Evidence demonstrating readiness aligned with the learner discovery profile.',
        rationale: `Derived from discovery profile "${context.discovery.profile}" and recommendation state "${context.recommendation.state}".`,
      },
    ];

    return {
      evidenceId: `evidence-${context.userId}-${context.assembledAt}`,
      userId: context.userId,
      requirements,
      primaryRequirement: requirements[0].evidenceType,
      focusSummary: `Deterministic evidence plan (${EVIDENCE_FALLBACK_VERSION}) derived from goal "${context.goal.title}" and discovery profile "${context.discovery.profile}".`,
    };
  }
}
