import { BrainContext } from '../../../../infrastructure/ai-brain/brain-context.types';

export const DISCOVERY_PROMPT_VERSION = 'discovery-prompt-v1';

export function buildDiscoveryPrompt(context: BrainContext): string {
  return JSON.stringify({
    promptVersion: DISCOVERY_PROMPT_VERSION,
    instruction:
      'Suggest initial learning goal/skill focus areas as JSON: { suggestions: [{ goalArea, skillFocus, rationale }], ' +
      'primaryFocus, confidence, reasoning }. "confidence" must be a number in [0,1]. "reasoning" must briefly ' +
      'explain why these focus areas were chosen.',
    context: {
      discovery: context.discovery,
      goal: context.goal,
      recommendation: context.recommendation,
    },
  });
}
