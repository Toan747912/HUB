# Persistence Health Report (auto-generated)

Generated: 2026-07-03T16:40:16.288Z
Source: `Apps/ai-backend/scripts/audit-persistence.ts` — regex-based heuristics, not a type checker. Treat PARTIAL/narrow flags as prompts for manual review, not final verdicts.

| Repository | Mongo-backed | Create | Update | Delete | FindById | Filter query | Indexes | Outbox wired | Transaction |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| src/infrastructure/audit/audit-log.repository.ts | ✔ | ✘ | ✘ | ✘ | ✘ | ✔ | traceId, operation, resource, {resource,timestamp} | n/a (is sink) | ✘ |
| src/infrastructure/outbox/outbox.repository.ts | ✔ | ✔ | ✔ | ✘ | ✘ | ⚠ narrow | eventId, aggregateId, status, {status,occurredAt} | n/a (is sink) | ✘ |
| src/infrastructure/security/api-keys/api-key.repository.ts | ✔ | ✔ | ✔ | ✘ | ✘ | ⚠ narrow | keyHash | ✘ | ✘ |
| src/infrastructure/security/auth/refresh-token.repository.ts | ✔ | ✔ | ✔ | ✘ | ✔ | ✘ | userId, familyId | ✘ | ✘ |
| src/infrastructure/security/auth/user.repository.ts | ✔ | ✔ | ✔ | ✘ | ✔ | ⚠ narrow | username | ✘ | ✘ |
| src/modules/assessment/infrastructure/persistence/repositories/mongo-assessment.repository.ts | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | learnerId, {learnerId,status}, {roadmapId} | ✔ | ✘ |
| src/modules/goal/infrastructure/persistence/repositories/mongo-goal.repository.ts | ✔ | ✔ | ✔ | ✔ | ✔ | ⚠ unfiltered (full scan) | learnerId, {learnerId,status} | ✔ | ✘ |
| src/modules/migration/infrastructure/repositories/in-memory-migration.repository.ts | ✘ (not Mongo) | ✔ | ✔ | ✘ | ✘ | ⚠ narrow | ✘ none found | n/a | ✘ |
| src/modules/recommendation/infrastructure/persistence/repositories/mongo-recommendation.repository.ts | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | learnerId, {learnerId,status}, {roadmapId} | ✔ | ✘ |
| src/modules/roadmap/infrastructure/persistence/repositories/mongo-roadmap.repository.ts | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | learnerId, {learnerId,status}, {goalId} | ✔ | ✘ |
| src/modules/skill/infrastructure/persistence/repositories/mongo-skill.repository.ts | ✔ | ✔ | ✔ | ✘ | ✔ | ⚠ narrow | skillId, normalizedName | ✘ | ✘ |

## Raw-Mongo-outside-repository leak scan

None found — every `@InjectModel(` usage is confined to a `*.repository.ts` file.
