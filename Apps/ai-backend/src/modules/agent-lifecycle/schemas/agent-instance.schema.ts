import { LifecycleState } from '../domain/lifecycle-state';

export interface AgentInstanceDocument {
  _id: string;
  agentId: string;
  workflowId: string;
  status: LifecycleState;
  startedAt: Date | null;
  endedAt: Date | null;
  currentStep: string | null;
  completedSteps: string[];
  failedSteps: string[];
  traceId: string;
  userId: string | null;
  sessionId: string | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}
