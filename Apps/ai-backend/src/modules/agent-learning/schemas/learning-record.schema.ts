export interface LearningRecordDocument {
  _id: string;
  experience: Record<string, unknown>;
  patternIds: string[];
  knowledgeItemIds: string[];
  recommendationIds: string[];
  feedback: Record<string, unknown>;
  workflowId: string;
  createdAt: Date;
  updatedAt: Date;
}
