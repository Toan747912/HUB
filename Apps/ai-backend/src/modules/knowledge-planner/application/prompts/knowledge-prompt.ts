import { BrainContext } from '../../../../infrastructure/ai-brain/brain-context.types';

export const KNOWLEDGE_PROMPT_VERSION = 'knowledge-prompt-v1';

export function buildKnowledgePrompt(context: BrainContext): string {
  return JSON.stringify({
    promptVersion: KNOWLEDGE_PROMPT_VERSION,
    instruction:
      'Suggest personalized knowledge recommendations as JSON: { recommendations: [{ topic, resourceType, rationale }], ' +
      'primaryTopic, confidence, reasoning }. "confidence" must be a number in [0,1]. "reasoning" must briefly ' +
      'explain why these knowledge recommendations were chosen.',
    context: {
      goal: context.goal,
      roadmap: context.roadmap,
      assessment: context.assessment ?? null,
      recommendation: context.recommendation,
      discovery: context.discovery,
    },
  });
}
