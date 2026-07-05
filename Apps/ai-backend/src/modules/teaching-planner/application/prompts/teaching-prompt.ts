import { BrainContext } from '../../../../infrastructure/ai-brain/brain-context.types';

export const TEACHING_PROMPT_VERSION = 'teaching-prompt-v1';

export function buildTeachingPrompt(context: BrainContext): string {
  return JSON.stringify({
    promptVersion: TEACHING_PROMPT_VERSION,
    instruction:
      'Generate the next personalized teaching actions for the learner, as JSON: ' +
      '{ actions: [{ actionType, description, rationale }], primaryAction, confidence, reasoning }. ' +
      '"confidence" must be a number in [0,1]. "reasoning" must briefly explain why these actions are next.',
    context: {
      goal: context.goal,
      roadmap: context.roadmap,
      assessment: context.assessment ?? null,
      recommendation: context.recommendation,
      discovery: context.discovery,
    },
  });
}
