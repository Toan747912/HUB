# MongoDB Persistence Model — As-Built (WP-06C)

> Canonical persistence diagram per [DECISION-058](../11_Decisions/DECISION-058-MongoDB-Canonical-Persistence-Store.md). Replaces `DatabaseBlueprint.md`/`LogicalDatabaseModel.md` (Postgres/Supabase track, superseded) as the current reference. Source of truth is always `Apps/ai-backend/src/modules/*/infrastructure/persistence/schemas/*.schema.ts` and `Apps/ai-backend/src/infrastructure/outbox/outbox-event.schema.ts` — this document is a snapshot, not a spec; if it drifts from the code, the code wins.

## Collections

```
goal                    roadmap                 assessment              recommendation          skill                   outbox_events
├─ _id (String)         ├─ _id (String)         ├─ _id (String)         ├─ _id (String)         ├─ _id (String)         ├─ _id (String)
├─ learnerId  [idx]      ├─ goalId    [idx]       ├─ goalId               ├─ goalId                ├─ skillId  [uniq,idx]  ├─ eventId  [uniq,idx]
├─ status                ├─ learnerId             ├─ roadmapId  [idx]     ├─ roadmapId             ├─ name                 ├─ aggregateId [idx]
├─ aggregateVersion      ├─ status                ├─ learnerId            ├─ assessmentId          ├─ normalizedName       ├─ aggregateType
├─ versions[]            ├─ aggregateVersion      ├─ status               ├─ learnerId             │  [uniq,idx]           ├─ aggregateVersion
│  ├─ version            ├─ phases[]              ├─ aggregateVersion     ├─ status                ├─ category             ├─ eventType
│  ├─ title/description  │  ├─ id/title/order     ├─ latestResult         ├─ aggregateVersion      ├─ parentSkillId        ├─ payload (Mixed)
│  ├─ type/difficulty/   │  └─ tasks[]            │  ├─ skillScores[]     ├─ engineVersion         ├─ aliases[]            ├─ occurredAt
│  │  priority           │     ├─ id/title/order  │  ├─ competencies[]    ├─ items[]               ├─ metadata (Mixed)     ├─ publishedAt
│  └─ targetDate         │     ├─ dependsOn[]     │  ├─ knowledgeGaps[]   │  ├─ id/type/skillId    └─ createdAt/          ├─ status [idx]
├─ constraints[]         │     ├─ complexity      │  ├─ confidenceScore   │  ├─ taskId/strategy       updatedAt           ├─ traceId
├─ milestones[]          │     └─ estimatedDur.   │  ├─ readiness         │  ├─ priority                                  ├─ correlationId
│  ├─ id/title/reached   ├─ milestones[]          │  ├─ weak/strongAreas  │  ├─ scores{}                                  ├─ causationId
│  └─ reachedAt          │  ├─ id/title/reached   │  └─ engineVersion     │  ├─ reason{}                                  └─ metadata (Mixed)
├─ progress              │  └─ tasks[]            ├─ history[]            │  ├─ affectedGoalId/                          [compound idx:
│  ├─ completionRatio    ├─ regenerationHistory[] │  └─ invalidatedAt     │  │  RoadmapId/AssessmentId                     status+occurredAt]
│  └─ reachedMilestone   │  ├─ version/reason/    └─ (timestamps)         │  └─ logicalResourceRef
│     Ids[]              │     plannerVersion                            ├─ learningStrategies[]
└─ (timestamps)          └─ invalidatedAt                                ├─ reviewSchedules[]
                            (timestamps)                                 ├─ priorityDecisions[]
                                                                          ├─ history[]
                                                                          └─ invalidatedAt
                                                                             (timestamps)
```

## Notes on the as-built model

- **Cross-module references** (`roadmap.goalId`, `assessment.goalId`/`roadmapId`, `recommendation.goalId`/`roadmapId`/`assessmentId`, `recommendationItem.skillId`/`taskId`/`affectedGoalId`/`affectedRoadmapId`/`affectedAssessmentId`) are stored as plain `String` at the persistence layer — this is the intentional "backward-compatible persistence mapping" from [DECISION-056](../11_Decisions/DECISION-056-Canonical-Typed-Identifiers.md): typed IDs (`GoalId`, `RoadmapId`, etc.) exist in the domain layer only, converted to/from `string` at the persistence-mapper boundary. There is no database-level foreign-key constraint — Mongo doesn't have one — so referential integrity is enforced only by the application layer (and, from WP-06C Workstream F, by the orchestration layer's invalidation propagation).
- **`skill`** is new in WP-06C ([DECISION-057](../11_Decisions/DECISION-057-Canonical-Skill-Catalog.md)) — replaces the free-text `skillArea` field that previously appeared inline on `assessment`/`recommendation` documents.
- **`outbox_events`** gained `aggregateType`, `traceId`, `correlationId`, `causationId`, and `metadata` in WP-06C Workstream E ([DECISION-059](../11_Decisions/DECISION-059-Platform-Orchestration-Layer.md) builds on this) — previously only `eventId/aggregateId/aggregateVersion/eventType/payload/occurredAt/publishedAt/status` were persisted, and trace/correlation/causation were fabricated on relay rather than preserved. See `Docs/13_Platform_Consistency/PlatformEventContractSpecification.md` for the full contract.
- **`invalidatedAt`** on `roadmap`/`assessment`/`recommendation` is new in WP-06C Workstream F — a staleness flag set by the orchestration layer, orthogonal to each document's own `status` field. It is not a soft-delete marker.
- **No unique indexes exist** beyond `skill.skillId`/`skill.normalizedName` and `outbox_events.eventId` — WP-06B flagged that no schema enforces e.g. "one active goal per learner" at the database level; this remains an open item (see `Docs/13_Platform_Consistency/PlatformStandardizationCertificationChecklist.md`), not resolved by this batch.
- **No soft-delete field** (`deletedAt`/`isDeleted`) exists on any of the five domain collections — also an open item, not introduced here since it would be new lifecycle/business behavior, out of WP-06C's scope.

## Related Documents
- [DECISION-058-MongoDB-Canonical-Persistence-Store.md](../11_Decisions/DECISION-058-MongoDB-Canonical-Persistence-Store.md)
- [DatabaseBlueprint.md](DatabaseBlueprint.md), [LogicalDatabaseModel.md](LogicalDatabaseModel.md) — superseded Postgres/Supabase track this document replaces as the current reference.
