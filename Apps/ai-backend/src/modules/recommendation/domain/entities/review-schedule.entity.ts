export class ReviewSchedule {
  constructor(
    public readonly skillArea: string,
    public readonly intervalDays: number,
    public readonly dueDate: string,
    public readonly reason: string
  ) {}
}
