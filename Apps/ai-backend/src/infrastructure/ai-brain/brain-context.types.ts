export interface BrainContextRequest {
  userId: string;
  goalId: string;
  sessionId: string;
  traceId: string;
}

export interface BrainContext {
  userId: string;
  goalId: string;
  sessionId: string;
  traceId: string;
  goal: { id: string; title: string };
  roadmap: { nodeId: string; status: string };
  session: { id: string; phase: string };
  recommendation: { state: string };
  discovery: { profile: string };
  assembledAt: string;
}
