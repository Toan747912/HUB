# Audit and Versioning Migration Strategy (WP-03 Planning)

## 1. Purpose

Define physical consolidation migration planning for:
- audit metadata normalization
- lifecycle/soft-delete behavior normalization
- mutable vs append-only versioning alignment
- lineage-safe transition planning

This document is planning-only and does not perform migrations.

---

## 2. Strategy Objectives

1. Align physical audit columns with canonical audit standards.
2. Align physical lifecycle fields with canonical soft-delete policies.
3. Align physical versioning behavior with canonical mutable/append-only model.
4. Preserve ownership/boundary safety during audit/versioning normalization.
5. Prevent historical lineage loss in decision/session/explainability-related entities.

---

## 3. Audit Migration Planning Model

Audit migration action classes:
- KEEP_AUDIT_STRUCTURE
- NORMALIZE_AUDIT_NAMES
- ADD_MISSING_AUDIT_FIELDS (planning)
- DEPRECATE_NON_CANONICAL_AUDIT_FIELDS
- REQUIRES_GOVERNANCE_DECISION

Required canonical audit fields (by lifecycle class):
- Mutable tables: `created_at`, `created_by_actor_type`, `updated_at`, `updated_by_actor_type`
- Append-only tables: `created_at`, `created_by_actor_type`

---

## 4. Versioning Migration Planning Model

Versioning action classes:
- KEEP_VERSION_POLICY
- ADD_VERSION_NUMBER_POLICY (planning)
- MIGRATE_TO_APPEND_ONLY_POLICY
- REMOVE_NON_CANONICAL_VERSION_FIELD (planning)
- REQUIRES_GOVERNANCE_DECISION

Versioning standards:
- mutable conflict-sensitive entities should use `version_number`
- append-only entities should use sequence/time lineage, not mutable row overwrite

---

## 5. Lifecycle and Soft Delete Migration Planning

Lifecycle action classes:
- KEEP_STATUS_MODEL
- NORMALIZE_STATUS_VALUES
- ADD_ARCHIVAL_MARKERS (planning)
- REMOVE_HARD_DELETE_DEFAULT_PATH (planning)
- EXCEPTION_REQUIRED

Canonical preference:
- lifecycle transitions over hard delete
- explicit `archived_at` / `closed_at` / `expires_at` semantics where applicable

---

## 6. Domain-Specific Alignment Strategy

## 6.1 Goal/Roadmap
- Preserve roadmap lifecycle snapshots and archival semantics.
- Normalize audit actor/time fields on mutable tables.

## 6.2 Knowledge/Evidence/Assessment
- Preserve append-dominant evidence/assessment records.
- Keep mastery as mutable versioned snapshot under assessment ownership.

## 6.3 Discovery/Recommendation
- Preserve lifecycle closure/expiry semantics.
- ensure append response history remains immutable.

## 6.4 Learning Session/Mentor Interaction
- preserve session transition lineage.
- normalize close/archive lifecycle and update audit fields.

## 6.5 Decision Persistence/Explainability
- maintain append-only immutable behavior for decision and trace records.
- ensure no consolidation step creates mutable overwrite paths.

---

## 7. Contradiction Detection Rules

Flag as migration contradiction if:
1. append-only table is proposed for mutable overwrite behavior.
2. mutable snapshot table lacks conflict/version policy.
3. audit-required table lacks update provenance fields.
4. lifecycle-constrained table depends on hard-delete default flow.
5. consolidation proposal removes decision/trace creation provenance.

---

## 8. Migration Sequence Safety Guidance

Planning sequence:
1. audit field normalization policy definition
2. lifecycle semantics normalization policy definition
3. versioning policy alignment by table class
4. contradiction and exception review
5. readiness gate packaging

Sequence must avoid introducing temporary states where audit/versioning semantics are undefined.

---

## 9. Risk Controls

1. Never redefine append-only entities as mutable without governance decision.
2. Never drop lineage-relevant timestamps/actors in planning targets.
3. Keep ownership-safe mutation boundaries intact when introducing version policies.
4. Ensure legacy field alias mapping is captured before canonical name normalization.

---

## 10. Validation Checklist (Audit & Versioning Migration Audit)

A pass requires:
1. lifecycle class assigned for every mapped canonical table.
2. audit field policy defined and non-contradictory.
3. versioning policy defined and non-contradictory.
4. no data-loss path in decision/session/trace lineage.
5. no ownership/boundary drift introduced by versioning assumptions.

---

## 11. Readiness Criteria

Strategy is ready when:
- no Critical/High audit/versioning contradiction remains,
- all mutable/append-only classes have explicit migration policy mapping,
- lineage preservation controls are explicit,
- unresolved exceptions are tracked in risk register with mitigation.

---

## 12. Alignment References

- `CanonicalAuditAndSoftDeleteStandards.md`
- `CanonicalVersioningStandards.md`
- `CanonicalColumnStandards.md`
- `CanonicalTableCatalog.md`
- `PhysicalTableMappingMatrix.md`
- `DataMigrationRiskRegister.md`
- `SQLConsolidationReadinessReview.md`
