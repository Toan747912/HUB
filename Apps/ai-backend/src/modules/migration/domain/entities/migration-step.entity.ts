export class MigrationStep {
  constructor(
    public readonly id: string,
    public readonly order: number,
    public readonly name: string,
    public readonly reason: string,
    public readonly sqlUpBatch: string[],
    public readonly sqlDownBatch: string[],
    public readonly dependencies: string[] = [],
  ) {}
}
