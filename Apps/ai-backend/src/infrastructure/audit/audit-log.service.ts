import { Injectable } from '@nestjs/common';
import { GoalDomainEvent } from '../../modules/goal/domain/events/goal-event-metadata';
import { RequestContextService } from '../observability/request-context.service';
import { AuditLogRepository } from './audit-log.repository';

@Injectable()
export class AuditLogService {
  constructor(
    private readonly repository: AuditLogRepository,
    private readonly requestContext?: RequestContextService
  ) {}

  /**
   * Domain events carry post-state (payload) but not pre-state, so `before` is
   * honestly recorded as null rather than reconstructed/guessed.
   */
  async recordFromDomainEvent(event: GoalDomainEvent): Promise<void> {
    // Event types are always "<AggregateName><Action>" (e.g. GoalCreated,
    // RoadmapPublished), so the leading capitalized word names the aggregate
    // without needing a per-module audit adapter.
    const aggregateName = event.type.match(/^[A-Z][a-z]+/)?.[0] ?? 'Aggregate';
    await this.repository.record({
      traceId: event.metadata.traceId,
      userId: this.requestContext?.get()?.userId ?? null,
      operation: event.type,
      resource: `${aggregateName}:${event.metadata.aggregateId}`,
      before: null,
      after: event.payload
    });
  }

  /**
   * Additive: records non-domain security events (login, logout, token refresh,
   * permission denial, role changes) through the same durable audit trail.
   */
  async recordSecurityEvent(entry: {
    traceId: string;
    userId: string | null;
    operation: string;
    resource: string;
    after?: unknown;
  }): Promise<void> {
    await this.repository.record({
      traceId: entry.traceId,
      userId: entry.userId,
      operation: entry.operation,
      resource: entry.resource,
      before: null,
      after: entry.after ?? null
    });
  }
}
