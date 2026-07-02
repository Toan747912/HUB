# Index Migration Strategy (WP-03 Planning)

## 1. Purpose

Define migration planning strategy to align Batch 0–5 physical index landscape with WP-02 canonical index policy.

Scope:
- index inventory mapping
- naming normalization planning
- coverage gap analysis
- redundancy/deprecation planning
- dependency-safe sequencing guidance

No SQL or migration scripts are generated.

---

## 2. Strategy Objectives

1. Preserve all required FK lookup performance paths.
2. Align index names with canonical deterministic conventions.
3. Eliminate redundant indexes that add maintenance cost without query value.
4. Protect hot-path domain queries and event/idempotency flows.
5. Preserve explainability and decision trace traversal performance.

---

## 3. Index Migration Classification

For each physical index:
- KEEP_AS_IS
- RENAME_TO_CANONICAL
- REORDER_COLUMNS (planning)
- SPLIT_INDEX (planning)
- ADD_MISSING (planning)
- DEPRECATE_REDUNDANT
- REQUIRES_DECISION

Severity:
- Critical
- High
- Medium
- Low

---

## 4. Canonical Alignment Anchors

Reference standard:
- `CanonicalIndexStrategy.md`

Required alignment classes:
1. PK/FK support indexes
2. Unique backing indexes
3. lifecycle hot-path indexes
4. event idempotency/correlation indexes
5. decision/trace traversal indexes

---

## 5. Migration Planning Workflow

### Step 1 — Physical Inventory
- enumerate all Batch 0–5 indexes (conceptual planning inventory).
- classify by table and query intent.

### Step 2 — Canonical Match
- map each physical index to canonical index class.
- identify naming drift and semantic drift.

### Step 3 — Gap and Redundancy Analysis
- identify missing canonical coverage.
- identify overlaps/redundancy risk.
- identify wrong leading-column patterns for expected access paths.

### Step 4 — Dependency and Sequence Planning
- sequence updates to avoid lookup regressions.
- preserve FK-related performance during transition planning.
- define rollback-safe mapping references.

---

## 6. Core Index Migration Policies

## 6.1 FK Coverage Policy
- every physical FK path should have index support in target state.
- composite indexes must align with leading filter usage.
- if FK appears non-leading in current composite and queried directly, plan dedicated index.

## 6.2 Naming Normalization Policy
Canonical naming:
- `ix_<table>__<column_list>`
- `uqx_<table>__<scope>`
- `pix_<table>__<scope>__<column_list>`

No anonymous or inconsistent naming in canonical target.

## 6.3 Redundancy Control Policy
Deprecation candidates include:
- exact duplicate coverage indexes
- index fully subsumed by prefix-equivalent with no reverse-path need
- low-value index with write amplification risk and no hot-path support

---

## 7. Domain-Specific Priority Paths

## 7.1 Assessment and Mastery
Critical index paths:
- `assessment_result` by `knowledge_node_id`
- `knowledge_node_mastery` by `knowledge_node_id`
- `knowledge_node_mastery` by `last_assessment_result_id`
- mastery lookup by learner+node

## 7.2 Recommendation and Session
- active recommendations by learner/status
- session active-state lookup and transition traversal
- mentor session lookup by sub_session/session context

## 7.3 Decision and Explainability
- decision header lookup by source/type/time
- decision detail lookup by decision_header_id
- trace graph traversal by source/target/type/time

---

## 8. Risk Controls

1. Never remove index coverage before replacement coverage is planned.
2. Treat FK-path index gaps as migration readiness risks.
3. Validate index policy against boundary-safe access paths (avoid encouraging forbidden joins).
4. Preserve idempotency lookup performance for event-consumer workloads.
5. Ensure traceability queries remain performant after normalization.

---

## 9. Validation Checklist (Index Migration Audit)

A strategy pass must confirm:
1. all required canonical index classes are represented.
2. naming policy is consistently applied.
3. FK coverage is complete for physical FK paths.
4. redundancy/deprecation proposals are justified.
5. decision/trace/event-critical paths retain coverage.

---

## 10. Readiness Criteria

Index migration strategy is ready when:
- no Critical/High unresolved index coverage issue remains,
- canonical naming migration map is complete,
- FK and traceability hot-path coverage is preserved,
- deprecation proposals are non-destructive and reversible in planning logic.

---

## 11. Alignment References

- `CanonicalIndexStrategy.md`
- `CanonicalConstraintCatalog.md`
- `ConstraintMigrationStrategy.md`
- `PhysicalTableMappingMatrix.md`
- `SQLConsolidationReadinessReview.md`
