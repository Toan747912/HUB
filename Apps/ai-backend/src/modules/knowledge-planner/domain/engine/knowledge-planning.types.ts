export interface KnowledgeRecommendation {
  topic: string;
  resourceType: string;
  rationale: string;
}

export interface KnowledgePlan {
  knowledgeId: string;
  userId: string;
  recommendations: KnowledgeRecommendation[];
  primaryTopic: string;
  focusSummary: string;
}
