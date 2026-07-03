export class SessionNotes {
  constructor(
    public readonly content: string,
    public readonly updatedAt: Date = new Date(),
  ) {}
}
