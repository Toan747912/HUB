export interface IAgentContext {
  traceId: string;
  userId: string;
  sessionId?: string;
  metadata: Record<string, unknown>;
}
