import { BrainContext } from '../../../../infrastructure/ai-brain/brain-context.types';

export const MISSION_PROMPT_VERSION = 'mission-prompt-v1';

export function buildMissionPrompt(context: BrainContext): string {
  return JSON.stringify({
    promptVersion: MISSION_PROMPT_VERSION,
    instruction:
      'Generate today\'s learning mission as JSON: { tasks: [{ id, title, description, estimatedMinutes, source }], ' +
      'focusSummary, confidence, reasoning }. "source" must be one of roadmap|recommendation|review. ' +
      '"confidence" must be a number in [0,1]. "reasoning" must briefly explain why these tasks were chosen.',
    context: {
      goal: context.goal,
      roadmap: context.roadmap,
      session: context.session,
      recommendation: context.recommendation,
    },
  });
}
