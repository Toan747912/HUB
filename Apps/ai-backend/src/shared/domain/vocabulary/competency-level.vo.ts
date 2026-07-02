export type CompetencyLevelValue = 'NOVICE' | 'DEVELOPING' | 'PROFICIENT' | 'ADVANCED' | 'EXPERT';

const ALLOWED_LEVELS: CompetencyLevelValue[] = ['NOVICE', 'DEVELOPING', 'PROFICIENT', 'ADVANCED', 'EXPERT'];

const ORDER: CompetencyLevelValue[] = ['NOVICE', 'DEVELOPING', 'PROFICIENT', 'ADVANCED', 'EXPERT'];

/**
 * Canonical competency-level vocabulary. Currently referenced only by the
 * assessment module, but positioned here as a platform-level definition so
 * future modules (e.g. a Learning Session module) can reference the same
 * definition rather than redefining it.
 */
export class CompetencyLevel {
  private constructor(private readonly value: CompetencyLevelValue) {}

  static create(value: string): CompetencyLevel {
    const normalized = value?.toUpperCase() as CompetencyLevelValue;
    if (!ALLOWED_LEVELS.includes(normalized)) {
      throw new Error('COMPETENCY_LEVEL_INVALID');
    }
    return new CompetencyLevel(normalized);
  }

  static fromScore(score: number): CompetencyLevel {
    if (score < 20) return new CompetencyLevel('NOVICE');
    if (score < 40) return new CompetencyLevel('DEVELOPING');
    if (score < 70) return new CompetencyLevel('PROFICIENT');
    if (score < 90) return new CompetencyLevel('ADVANCED');
    return new CompetencyLevel('EXPERT');
  }

  getValue(): CompetencyLevelValue {
    return this.value;
  }

  rank(): number {
    return ORDER.indexOf(this.value);
  }
}
