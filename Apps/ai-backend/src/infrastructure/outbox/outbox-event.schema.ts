export type OutboxStatus = 'PENDING' | 'PUBLISHED' | 'FAILED';

export interface OutboxEventDocument {
  id: string;
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  aggregateVersion: number;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  publishedAt: Date | null;
  status: OutboxStatus;
  traceId: string;
  correlationId: string;
  causationId: string;
  metadata: Record<string, unknown>;
}
