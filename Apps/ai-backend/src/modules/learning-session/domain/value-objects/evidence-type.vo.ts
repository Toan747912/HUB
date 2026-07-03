export type EvidenceTypeValue =
  | 'COMPLETED_TASKS'
  | 'TIME_SPENT'
  | 'COMPLETION_RATE'
  | 'INTERRUPTIONS'
  | 'REVISION_COUNT'
  | 'FOCUS_SCORE'
  | 'ENGAGEMENT_SCORE'
  | 'ACTIVITY_HISTORY';

const ALLOWED_TYPES: EvidenceTypeValue[] = [
  'COMPLETED_TASKS',
  'TIME_SPENT',
  'COMPLETION_RATE',
  'INTERRUPTIONS',
  'REVISION_COUNT',
  'FOCUS_SCORE',
  'ENGAGEMENT_SCORE',
  'ACTIVITY_HISTORY',
];

export class EvidenceType {
  private constructor(private readonly value: EvidenceTypeValue) {}

  static create(value: string): EvidenceType {
    const normalized = value?.toUpperCase().trim() as EvidenceTypeValue;
    if (!ALLOWED_TYPES.includes(normalized)) {
      throw new Error(`EVIDENCE_TYPE_INVALID: ${value}`);
    }
    return new EvidenceType(normalized);
  }

  getValue(): EvidenceTypeValue {
    return this.value;
  }
}
