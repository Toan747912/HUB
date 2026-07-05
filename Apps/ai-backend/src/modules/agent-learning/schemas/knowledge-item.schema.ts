import { KnowledgeItemType } from '../domain/knowledge-item';

export interface KnowledgeItemDocument {
  _id: string;
  type: KnowledgeItemType;
  subject: string;
  description: string;
  confidence: number;
  evidence: string[];
  createdAt: Date;
  updatedAt: Date;
}
