export interface AuditEventDocument {
  _id: string;
  traceId: string;
  userId: string | null;
  operation: string;
  resource: string;
  before: unknown;
  after: unknown;
  timestamp: Date;
}
