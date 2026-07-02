import { GoalDomainEvent } from '../../../modules/goal/domain/events/goal-event-metadata';
import { RequestContextService } from '../../observability/request-context.service';
import { AuditLogRepository } from '../audit-log.repository';
import { AuditLogService } from '../audit-log.service';

const makeEvent = (overrides: Partial<GoalDomainEvent> = {}): GoalDomainEvent => ({
  type: 'GoalCreated',
  metadata: {
    eventId: 'evt-1',
    aggregateId: 'goal-1',
    aggregateVersion: 1,
    occurredAt: new Date().toISOString(),
    traceId: 'trace-1',
    correlationId: 'corr-1',
    causationId: 'cause-1'
  },
  payload: { title: 'Learn TS' },
  ...overrides
});

describe('AuditLogService', () => {
  let repository: jest.Mocked<Pick<AuditLogRepository, 'record'>>;
  let service: AuditLogService;

  beforeEach(() => {
    repository = { record: jest.fn().mockResolvedValue(undefined) };
    service = new AuditLogService(repository as unknown as AuditLogRepository);
  });

  it('maps a domain event to an audit entry with resource = Goal:<aggregateId>', async () => {
    await service.recordFromDomainEvent(makeEvent());

    expect(repository.record).toHaveBeenCalledWith({
      traceId: 'trace-1',
      userId: null,
      operation: 'GoalCreated',
      resource: 'Goal:goal-1',
      before: null,
      after: { title: 'Learn TS' }
    });
  });

  it('honestly records before as null (domain events carry no pre-state)', async () => {
    await service.recordFromDomainEvent(makeEvent({ type: 'GoalCompleted' }));
    const call = repository.record.mock.calls[0][0];
    expect(call.before).toBeNull();
    expect(call.operation).toBe('GoalCompleted');
  });

  it('pulls userId from RequestContextService when available', async () => {
    const requestContext = new RequestContextService();
    const withContext = new AuditLogService(repository as unknown as AuditLogRepository, requestContext);

    await requestContext.run({ traceId: 'trace-1', userId: 'user-7' }, () => withContext.recordFromDomainEvent(makeEvent()));

    expect(repository.record).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-7' }));
  });
});
