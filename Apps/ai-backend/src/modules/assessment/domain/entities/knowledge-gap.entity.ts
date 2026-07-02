export class KnowledgeGap {
  constructor(
    public readonly id: string,
    public readonly skillArea: string,
    public readonly weight: string,
    public readonly reason: string
  ) {}
}
