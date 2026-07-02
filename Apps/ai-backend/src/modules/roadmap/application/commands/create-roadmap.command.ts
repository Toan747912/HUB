export class CreateRoadmapCommand {
  constructor(
    public readonly roadmapId: string,
    public readonly goalId: string,
    public readonly learnerId: string,
    public readonly title: string,
    public readonly description: string,
    public readonly goalType: string,
    public readonly difficulty: string,
    public readonly priority: string,
    public readonly constraints: string[],
    public readonly targetDate: string,
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string
  ) {}
}
