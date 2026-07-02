export type DomainRoute =
  | 'goal'
  | 'roadmap'
  | 'learning_session'
  | 'knowledge'
  | 'evidence'
  | 'assessment'
  | 'recommendation'
  | 'discovery'
  | 'teaching';

export interface AiExecuteInput {
  userId: string;
  goalId: string;
  sessionId: string;
  message: string;
  signals?: {
    stuckScore?: number;
    mismatchDetected?: boolean;
    regressionDetected?: boolean;
    recommendationPriority?: number;
    triggerInvalidJson?: boolean;
  };
}

export interface ContextSlice {
  goal?: { id: string; title: string };
  roadmap?: { nodeId: string; status: string };
  learning_session?: { id: string; phase: string };
  knowledge?: { nodeIds: string[] };
  evidence?: { refs: string[] };
  assessment?: { refs: string[] };
  recommendation?: { state: string };
  discovery?: { profile: string };
  teaching?: { hints: string[] };
}

export interface MemorySlice {
  recentMessages: string[];
}

export interface ExplainableAiOutput {
  action: string;
  response: string;
  confidence: number;
  reasoning: string;
  traced_to: string[];
  route: DomainRoute;
}
