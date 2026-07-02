export type RecommendationHistoryReason = 'GENERATED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';

export class RecommendationHistory {
  constructor(
    public readonly version: number,
    public readonly reason: RecommendationHistoryReason,
    public readonly engineVersion: string,
    public readonly itemCount: number,
    public readonly averageConfidence: number,
    public readonly createdAt: Date = new Date()
  ) {}
}
