import { BrainContext } from '../../../../infrastructure/ai-brain/brain-context.types';

export const EVIDENCE_PROMPT_VERSION = 'evidence-prompt-v1';

export function buildEvidencePrompt(context: BrainContext): string {
  return JSON.stringify({
    promptVersion: EVIDENCE_PROMPT_VERSION,
    instruction:
      'Determine which evidence is required before the learner can safely continue, as JSON: ' +
      '{ requirements: [{ evidenceType, description, rationale }], primaryRequirement, confidence, reasoning }. ' +
      '"confidence" must be a number in [0,1]. "reasoning" must briefly explain why this evidence is required.',
    context: {
      goal: context.goal,
      roadmap: context.roadmap,
      assessment: context.assessment ?? null,
      recommendation: context.recommendation,
      discovery: context.discovery,
    },
  });
}
