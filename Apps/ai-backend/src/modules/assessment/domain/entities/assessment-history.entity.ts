export type AssessmentHistoryReason = 'CREATED' | 'RUN' | 'APPROVED' | 'ARCHIVED';

export class AssessmentHistory {
  constructor(
    public readonly version: number,
    public readonly reason: AssessmentHistoryReason,
    public readonly engineVersion: string,
    public readonly confidenceScore: number,
    public readonly readiness: string,
    public readonly gapCount: number,
    public readonly createdAt: Date = new Date(),
  ) {}
}
