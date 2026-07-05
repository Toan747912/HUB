import { KnowledgeRecommendation } from '../../domain/engine/knowledge-planning.types';

export interface KnowledgePlanRequest {
  userId: string;
  goalId: string;
  sessionId: string;
  traceId: string;
  provider?: string;
  model?: string;
}

export interface KnowledgePlanResponse {
  knowledgeId: string;
  userId: string;
  recommendations: KnowledgeRecommendation[];
  primaryTopic: string;
  confidence: number;
  explanation: string;
  provider: string;
  model: string;
  fallbackUsed: boolean;
  promptVersion: string;
}
