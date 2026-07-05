export interface CoordinationPlanDocument {
  _id: string;
  agents: Record<string, unknown>[];
  executionOrder: Record<string, unknown>[];
  sharedMemoryScopes: string[];
  executionPolicy: string;
  dependencies: Record<string, string[]>;
  expectedOutputs: string[];
  createdAt: Date;
  updatedAt: Date;
}
