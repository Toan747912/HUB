import { EvidenceRequirement } from '../../domain/engine/evidence-planning.types';

export interface EvidencePlanRequest {
  userId: string;
  goalId: string;
  sessionId: string;
  traceId: string;
  provider?: string;
  model?: string;
}

export interface EvidencePlanResponse {
  evidenceId: string;
  userId: string;
  requirements: EvidenceRequirement[];
  primaryRequirement: string;
  confidence: number;
  explanation: string;
  provider: string;
  model: string;
  fallbackUsed: boolean;
  promptVersion: string;
}
