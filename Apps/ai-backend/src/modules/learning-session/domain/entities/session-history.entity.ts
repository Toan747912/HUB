import { SessionStatus } from '../value-objects/session-status.vo';

export class SessionHistory {
  constructor(
    public readonly status: SessionStatus,
    public readonly updatedAt: Date = new Date(),
    public readonly reason: string | null = null,
  ) {}
}
