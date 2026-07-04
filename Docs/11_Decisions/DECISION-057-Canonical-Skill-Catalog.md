# DECISION-057 — Canonical Skill Catalog

- **Status:** ✅ **Accepted (Locked).**
- **Date:** 2026-07-02
- **Context:** WP-06B found `skillArea` was a caller-supplied free-text string threaded from Roadmap into Assessment and Recommendation with no canonical owner, no format contract, and no declared relationship to `KnowledgeNode`/`CompetencyLevel`. All three modules' readiness reviews independently flagged it as their top blocker to further platform work.

---

## Context

Because `skillArea` was free text, two aggregates could refer to "the same skill" with differently-spelled strings, and there was no way to enumerate, deduplicate, or validate skills platform-wide.

## Decision

1. A new `Apps/ai-backend/src/modules/skill/` module owns a `Skill` catalog: `skillId: SkillId`, `name`, `normalizedName` (unique index — prevents duplicate entries), `category`, `parentSkillId: SkillId | null`, `aliases: string[]`, `metadata`. It is intentionally minimal (no lifecycle/status/workflow) — a lookup catalog, not a new bounded context.
2. `skillArea: string` is removed from the Assessment and Recommendation domain layers and replaced with `skillId: SkillId` at the entity/aggregate boundary. Assessment/Recommendation **engines** (pure computation code) keep `skillId` as a plain `string` internally — `SkillId` objects are not usable as `Map` keys or in template-literal interpolation without extra care, so the typed boundary is placed at the aggregate, not inside engine internals. This mirrors the same domain-vs-computation-layer boundary established in DECISION-056.
3. `SkillCatalogService.findOrCreateByName()` is the only way new catalog entries are created — this keeps the catalog append-only and deduplicated by normalized name.
4. Existing `skillArea` string values (found only in test fixtures — no production seed data existed) were migrated via a one-time script (`src/modules/skill/scripts/migrate-skill-areas.script.ts`) into catalog entries. Results are recorded in `Docs/13_Platform_Consistency/PlatformMigrationPlan.md`.

## Consequences

- Any future module (e.g. a Learning Session Engine, or a future Knowledge module) referencing "what skill is this about" must use `SkillId`, not a new free-text field.
- The catalog has no HTTP surface yet (no controller) — it is consumed internally by application services via dependency injection. Exposing it externally is a future decision, not part of this batch.
- This does not resolve the broader `KnowledgeNode`/`CompetencyLevel`/`Skill` naming overlap flagged in WP-06B's `CanonicalEntityCatalog.md` — `KnowledgeNode` remains a stub concept (`knowledge` module is still a 2-file stub). Reconciling `Skill` and `KnowledgeNode` into one entity, if desired, is deferred to when the Knowledge module is actually implemented.

## Related Documents
- [Docs/13_Platform_Consistency/CanonicalSkillCatalog.md](../13_Platform_Consistency/CanonicalSkillCatalog.md)
- [Docs/13_Platform_Consistency/PlatformMigrationPlan.md](../13_Platform_Consistency/PlatformMigrationPlan.md)
- [DECISION-024-Concept-Is-KnowledgeNode.md](DECISION-024-Concept-Is-KnowledgeNode.md) — the unresolved `Skill`/`KnowledgeNode` relationship this decision does not settle.
