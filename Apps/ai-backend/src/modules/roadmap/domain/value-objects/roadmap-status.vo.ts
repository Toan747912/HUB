export type RoadmapStatusValue = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'COMPLETED';

const ALLOWED_STATUSES: RoadmapStatusValue[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'COMPLETED'];

export class RoadmapStatus {
  private constructor(private readonly value: RoadmapStatusValue) {}

  static create(value: string): RoadmapStatus {
    const normalized = value?.toUpperCase().replace(/\s+/g, '_') as RoadmapStatusValue;
    if (!ALLOWED_STATUSES.includes(normalized)) {
      throw new Error('ROADMAP_STATUS_INVALID');
    }
    return new RoadmapStatus(normalized);
  }

  static draft(): RoadmapStatus {
    return new RoadmapStatus('DRAFT');
  }

  getValue(): RoadmapStatusValue {
    return this.value;
  }

  isTerminal(): boolean {
    return this.value === 'ARCHIVED' || this.value === 'COMPLETED';
  }
}
