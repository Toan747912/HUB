export class PriorityDecision {
  constructor(
    public readonly taskId: string,
    public readonly priorityScore: number,
    public readonly originalOrder: number,
    public readonly suggestedOrder: number,
    public readonly blocked: boolean,
    public readonly rationale: string
  ) {}
}
