import { DiscoverySuggestion } from '../../domain/engine/discovery-planning.types';

export interface DiscoveryPlanRequest {
  userId: string;
  goalId: string;
  sessionId: string;
  traceId: string;
  provider?: string;
  model?: string;
}

export interface DiscoveryPlanResponse {
  discoveryId: string;
  userId: string;
  suggestions: DiscoverySuggestion[];
  primaryFocus: string;
  confidence: number;
  explanation: string;
  provider: string;
  model: string;
  fallbackUsed: boolean;
  promptVersion: string;
}
