import { RecommendationCategory } from '../domain/recommendation';

export interface RecommendationDocument {
  _id: string;
  category: RecommendationCategory;
  subject: string;
  description: string;
  confidence: number;
  basedOnKnowledgeItemIds: string[];
  createdAt: Date;
  updatedAt: Date;
}
