export class SkillScore {
  constructor(
    public readonly skillArea: string,
    public readonly rawScore: number,
    public readonly taskCount: number,
    public readonly completedTaskCount: number
  ) {}
}
