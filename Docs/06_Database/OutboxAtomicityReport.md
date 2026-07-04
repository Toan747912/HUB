# Outbox Atomicity Report (auto-generated)

Generated: 2026-07-04T01:38:48.169Z
Source: `Apps/ai-backend/scripts/audit-outbox.ts` — regex-based heuristics, not a type checker. Run via `npm run audit:outbox`. Not wired into CI; treat findings as a manual review checklist until the underlying pattern is actually implemented.

**10 violation(s), 0 warning(s).**

Rules: `MISSING_EVENT_EMISSION` (write with no event published), `NON_ATOMIC_WRITE_AND_EMIT` (write + emit present but not in a shared transaction), `DOMAIN_WRITE_NO_SESSION` / `OUTBOX_WRITE_NO_SESSION` (write method cannot accept a session, so it could never join a transaction even if the caller wrapped one), `DIRECT_REPOSITORY_WRITE_BYPASS` (repository write outside the command-service orchestration layer — warning only, may be a false positive for read-side code).

| File | Line | Rule | Severity | Message |
| --- | --- | --- | --- | --- |
| src/infrastructure/security/api-keys/api-key.repository.ts | 16 | DOMAIN_WRITE_NO_SESSION | violation | Repository write method "create" accepts no session parameter — it cannot participate in a shared transaction with the outbox write. |
| src/infrastructure/security/auth/refresh-token.repository.ts | 18 | DOMAIN_WRITE_NO_SESSION | violation | Repository write method "save" accepts no session parameter — it cannot participate in a shared transaction with the outbox write. |
| src/infrastructure/security/auth/user.repository.ts | 20 | DOMAIN_WRITE_NO_SESSION | violation | Repository write method "create" accepts no session parameter — it cannot participate in a shared transaction with the outbox write. |
| src/infrastructure/security/auth/user.repository.ts | 25 | DOMAIN_WRITE_NO_SESSION | violation | Repository write method "updateRoles" accepts no session parameter — it cannot participate in a shared transaction with the outbox write. |
| src/modules/assessment/infrastructure/persistence/repositories/mongo-assessment.repository.ts | 83 | DOMAIN_WRITE_NO_SESSION | violation | Repository write method "delete" accepts no session parameter — it cannot participate in a shared transaction with the outbox write. |
| src/modules/goal/infrastructure/persistence/repositories/mongo-goal.repository.ts | 69 | DOMAIN_WRITE_NO_SESSION | violation | Repository write method "delete" accepts no session parameter — it cannot participate in a shared transaction with the outbox write. |
| src/modules/migration/infrastructure/repositories/in-memory-migration.repository.ts | 48 | DOMAIN_WRITE_NO_SESSION | violation | Repository write method "save" accepts no session parameter — it cannot participate in a shared transaction with the outbox write. |
| src/modules/migration/infrastructure/repositories/in-memory-migration.repository.ts | 52 | DOMAIN_WRITE_NO_SESSION | violation | Repository write method "updateState" accepts no session parameter — it cannot participate in a shared transaction with the outbox write. |
| src/modules/recommendation/infrastructure/persistence/repositories/mongo-recommendation.repository.ts | 86 | DOMAIN_WRITE_NO_SESSION | violation | Repository write method "delete" accepts no session parameter — it cannot participate in a shared transaction with the outbox write. |
| src/modules/roadmap/infrastructure/persistence/repositories/mongo-roadmap.repository.ts | 83 | DOMAIN_WRITE_NO_SESSION | violation | Repository write method "delete" accepts no session parameter — it cannot participate in a shared transaction with the outbox write. |
