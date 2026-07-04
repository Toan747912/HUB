import { SessionId } from '../../../../shared/domain/identifiers';

export type LearningSessionEventMetadata = {
  eventId: string;
  aggregateId: SessionId;
  aggregateType: 'LearningSession';
  aggregateVersion: number;
  occurredAt: string;
  traceId: string;
  correlationId: string;
  causationId: string;
};

export type LearningSessionDomainEvent<TPayload = any> = {
  type:
    | 'LearningSessionCreated'
    | 'LearningSessionStarted'
    | 'LearningSessionPaused'
    | 'LearningSessionResumed'
    | 'LearningSessionCompleted'
    | 'LearningSessionCancelled'
    | 'EvidenceRecorded'
    | 'ProgressUpdated';
  metadata: LearningSessionEventMetadata;
  payload: TPayload;
};
