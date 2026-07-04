export class CreateLearningSessionCommand {
  constructor(
    public readonly sessionId: string,
    public readonly goalId: string,
    public readonly roadmapId: string,
    public readonly learnerId: string,
    public readonly assessmentId: string | null = null,
    public readonly tasks: Array<{ id: string; title: string; skillId: string }> = [],
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string,
  ) {}
}
