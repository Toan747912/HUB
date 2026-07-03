import { RoadmapDomainEvent, RoadmapEventMetadata } from './roadmap-event-metadata';

export type RoadmapCreatedPayload = {
  goalId: string;
  learnerId: string;
  status: string;
  phaseCount: number;
  estimatedDurationDays: number;
  complexity: string;
};

export type RoadmapUpdatedPayload = {
  changes: Record<string, unknown>;
};

export type RoadmapPublishedPayload = {
  previousStatus: string;
};

export type RoadmapArchivedPayload = {
  previousStatus: string;
};

export type RoadmapCompletedPayload = {
  previousStatus: string;
  completionRatio: number;
};

export type RoadmapRegeneratedPayload = {
  fromVersion: number;
  toVersion: number;
  plannerVersion: string;
  phaseCount: number;
  estimatedDurationDays: number;
  complexity: string;
};

export type RoadmapInvalidatedPayload = {
  reason: string;
};

export const roadmapCreatedEvent = (
  metadata: RoadmapEventMetadata,
  payload: RoadmapCreatedPayload,
): RoadmapDomainEvent<RoadmapCreatedPayload> => ({
  type: 'RoadmapCreated',
  metadata,
  payload,
});

export const roadmapUpdatedEvent = (
  metadata: RoadmapEventMetadata,
  payload: RoadmapUpdatedPayload,
): RoadmapDomainEvent<RoadmapUpdatedPayload> => ({
  type: 'RoadmapUpdated',
  metadata,
  payload,
});

export const roadmapPublishedEvent = (
  metadata: RoadmapEventMetadata,
  payload: RoadmapPublishedPayload,
): RoadmapDomainEvent<RoadmapPublishedPayload> => ({
  type: 'RoadmapPublished',
  metadata,
  payload,
});

export const roadmapArchivedEvent = (
  metadata: RoadmapEventMetadata,
  payload: RoadmapArchivedPayload,
): RoadmapDomainEvent<RoadmapArchivedPayload> => ({
  type: 'RoadmapArchived',
  metadata,
  payload,
});

export const roadmapCompletedEvent = (
  metadata: RoadmapEventMetadata,
  payload: RoadmapCompletedPayload,
): RoadmapDomainEvent<RoadmapCompletedPayload> => ({
  type: 'RoadmapCompleted',
  metadata,
  payload,
});

export const roadmapRegeneratedEvent = (
  metadata: RoadmapEventMetadata,
  payload: RoadmapRegeneratedPayload,
): RoadmapDomainEvent<RoadmapRegeneratedPayload> => ({
  type: 'RoadmapRegenerated',
  metadata,
  payload,
});

export const roadmapInvalidatedEvent = (
  metadata: RoadmapEventMetadata,
  payload: RoadmapInvalidatedPayload,
): RoadmapDomainEvent<RoadmapInvalidatedPayload> => ({
  type: 'RoadmapInvalidated',
  metadata,
  payload,
});
