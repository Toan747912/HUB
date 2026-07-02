export type KnowledgeWeightValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const ALLOWED_WEIGHTS: KnowledgeWeightValue[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const ORDER: KnowledgeWeightValue[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export class KnowledgeWeight {
  private constructor(private readonly value: KnowledgeWeightValue) {}

  static create(value: string): KnowledgeWeight {
    const normalized = value?.toUpperCase() as KnowledgeWeightValue;
    if (!ALLOWED_WEIGHTS.includes(normalized)) {
      throw new Error('KNOWLEDGE_WEIGHT_INVALID');
    }
    return new KnowledgeWeight(normalized);
  }

  /** severity: 0-100, higher means a bigger shortfall from the gap threshold. */
  static fromSeverity(severity: number): KnowledgeWeight {
    if (severity < 15) return new KnowledgeWeight('LOW');
    if (severity < 30) return new KnowledgeWeight('MEDIUM');
    if (severity < 50) return new KnowledgeWeight('HIGH');
    return new KnowledgeWeight('CRITICAL');
  }

  getValue(): KnowledgeWeightValue {
    return this.value;
  }

  rank(): number {
    return ORDER.indexOf(this.value);
  }
}
