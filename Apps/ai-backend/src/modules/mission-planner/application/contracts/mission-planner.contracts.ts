import { MissionTask } from '../../domain/engine/mission-planning.types';

export interface MissionPlanRequest {
  userId: string;
  goalId: string;
  sessionId: string;
  traceId: string;
  provider?: string;
  model?: string;
}

export interface MissionPlanResponse {
  missionId: string;
  goalId: string;
  sessionId: string;
  date: string;
  tasks: MissionTask[];
  focusSummary: string;
  confidence: number;
  explanation: string;
  provider: string;
  model: string;
  fallbackUsed: boolean;
  promptVersion: string;
}
