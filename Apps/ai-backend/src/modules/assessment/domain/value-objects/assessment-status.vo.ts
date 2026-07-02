export type AssessmentStatusValue = 'DRAFT' | 'COMPLETED' | 'APPROVED' | 'ARCHIVED';

const ALLOWED_STATUSES: AssessmentStatusValue[] = ['DRAFT', 'COMPLETED', 'APPROVED', 'ARCHIVED'];

export class AssessmentStatus {
  private constructor(private readonly value: AssessmentStatusValue) {}

  static create(value: string): AssessmentStatus {
    const normalized = value?.toUpperCase().replace(/\s+/g, '_') as AssessmentStatusValue;
    if (!ALLOWED_STATUSES.includes(normalized)) {
      throw new Error('ASSESSMENT_STATUS_INVALID');
    }
    return new AssessmentStatus(normalized);
  }

  static draft(): AssessmentStatus {
    return new AssessmentStatus('DRAFT');
  }

  getValue(): AssessmentStatusValue {
    return this.value;
  }

  // APPROVED/ARCHIVED lock the assessment against further RunAssessment mutation;
  // ArchiveAssessment itself bypasses this guard via the lifecycle transition table.
  isLockedForRun(): boolean {
    return this.value === 'APPROVED' || this.value === 'ARCHIVED';
  }
}
