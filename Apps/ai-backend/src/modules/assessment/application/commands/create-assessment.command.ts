export class CreateAssessmentCommand {
  constructor(
    public readonly assessmentId: string,
    public readonly goalId: string,
    public readonly roadmapId: string,
    public readonly learnerId: string,
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string,
  ) {}
}
