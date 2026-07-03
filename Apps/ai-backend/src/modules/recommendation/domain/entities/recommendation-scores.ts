export class RecommendationScores {
  constructor(
    public readonly priorityScore: number,
    public readonly needScore: number,
    public readonly urgencyScore: number,
    public readonly difficultyScore: number,
    public readonly confidenceScore: number,
    public readonly riskScore: number,
    public readonly overallScore: number,
  ) {}
}
