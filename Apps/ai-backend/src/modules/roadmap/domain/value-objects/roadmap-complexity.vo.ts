export type RoadmapComplexityValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

const ALLOWED_COMPLEXITIES: RoadmapComplexityValue[] = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];

const ORDER: RoadmapComplexityValue[] = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];

export class RoadmapComplexity {
  private constructor(private readonly value: RoadmapComplexityValue) {}

  static create(value: string): RoadmapComplexity {
    const normalized = value?.toUpperCase() as RoadmapComplexityValue;
    if (!ALLOWED_COMPLEXITIES.includes(normalized)) {
      throw new Error('ROADMAP_COMPLEXITY_INVALID');
    }
    return new RoadmapComplexity(normalized);
  }

  static fromScore(score: number): RoadmapComplexity {
    if (score <= 4) return new RoadmapComplexity('LOW');
    if (score <= 8) return new RoadmapComplexity('MEDIUM');
    if (score <= 12) return new RoadmapComplexity('HIGH');
    return new RoadmapComplexity('VERY_HIGH');
  }

  getValue(): RoadmapComplexityValue {
    return this.value;
  }

  rank(): number {
    return ORDER.indexOf(this.value);
  }
}
