export type SessionStatusValue =
  'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';

const ALLOWED_STATUSES: SessionStatusValue[] = [
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
];

export class SessionStatus {
  private constructor(private readonly value: SessionStatusValue) {}

  static create(value: string): SessionStatus {
    const normalized = value?.toUpperCase().replace(/\s+/g, '_') as SessionStatusValue;
    if (!ALLOWED_STATUSES.includes(normalized)) {
      throw new Error(`LEARNING_SESSION_STATUS_INVALID: ${value}`);
    }
    return new SessionStatus(normalized);
  }

  static draft(): SessionStatus {
    return new SessionStatus('DRAFT');
  }

  static active(): SessionStatus {
    return new SessionStatus('ACTIVE');
  }

  static paused(): SessionStatus {
    return new SessionStatus('PAUSED');
  }

  static completed(): SessionStatus {
    return new SessionStatus('COMPLETED');
  }

  static cancelled(): SessionStatus {
    return new SessionStatus('CANCELLED');
  }

  static archived(): SessionStatus {
    return new SessionStatus('ARCHIVED');
  }

  getValue(): SessionStatusValue {
    return this.value;
  }

  isTerminal(): boolean {
    return this.value === 'COMPLETED' || this.value === 'CANCELLED' || this.value === 'ARCHIVED';
  }
}
