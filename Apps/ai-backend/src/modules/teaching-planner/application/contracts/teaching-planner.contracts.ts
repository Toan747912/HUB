import { TeachingAction } from '../../domain/engine/teaching-planning.types';

export interface TeachingPlanRequest {
  userId: string;
  goalId: string;
  sessionId: string;
  traceId: string;
  provider?: string;
  model?: string;
}

export interface TeachingPlanResponse {
  teachingId: string;
  userId: string;
  actions: TeachingAction[];
  primaryAction: string;
  confidence: number;
  explanation: string;
  provider: string;
  model: string;
  fallbackUsed: boolean;
  promptVersion: string;
}
