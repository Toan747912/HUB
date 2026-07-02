# Physical Schema Consolidation Plan (WP-03)

## 1. Purpose

Define the documentation-first plan for consolidating physical SQL artifacts (Batch 0–5) into a canonical execution-ready physical baseline while preserving WP-01 and WP-02 governance decisions.

This plan does not generate migrations or SQL changes.

---

## 2. Scope

In scope:
1. Canonical-to-physical mapping definition.
2. Duplicate/overlap identification.
3. Column-level conflict classification.
4. Constraint migration strategy planning.
5. Index migration strategy planning.
6. Audit/versioning migration strategy planning.
7. Explainability persistence migration planning.
8. Risk register and readiness gates.

Out of scope:
- Migration scripts
- SQL execution
- Application/runtime implementation

---

## 3. Locked Inputs and Baselines

Frozen governance baselines:
- WP-01 artifacts (ownership, boundary, event, FK strategy)
- WP-02 artifacts (canonical schema/model/standards/gap analysis)

Physical baseline inputs:
- SQL Batch 0–5
- SQL review artifacts (including batch completion/readiness reports)

---

## 4. Consolidation Principles

1. Canonical governance overrides draft-era inconsistencies.
2. One physical write owner per consolidated table.
3. No ownership inversion or boundary drift.
4. Constraint/index/audit/versioning standards must map to canonical definitions.
5. Explainability and decision lineage must remain lossless.
6. Migration planning must be reversible and audit-safe.

---

## 5. Workstreams

## WS-01 Physical Table Mapping
Deliverables:
- `PhysicalTableMappingMatrix.md`
- `CanonicalToLegacyMapping.md`

Objective:
- map every canonical table to Batch 0–5 physical artifacts and classify state:
  - direct match
  - partial match
  - split/merge candidate
  - planned-only mapping

## WS-02 Constraint Planning
Deliverable:
- `ConstraintMigrationStrategy.md`

Objective:
- map existing constraints to canonical policy and identify:
  - keep
  - rename
  - tighten
  - relax
  - deprecate
  - add (planning-only)

## WS-03 Index Planning
Deliverable:
- `IndexMigrationStrategy.md`

Objective:
- map physical index set to canonical index strategy and classify:
  - aligned
  - naming drift
  - coverage gap
  - redundancy risk

## WS-04 Audit/Versioning Planning
Deliverable:
- `AuditAndVersioningMigrationStrategy.md`

Objective:
- align mutable/append-only entities to canonical audit/versioning standards and identify required migration steps (planning only).

## WS-05 Explainability Persistence Planning
Deliverable:
- `ExplainabilityPersistenceStrategy.md`

Objective:
- preserve trace and decision lineage semantics through consolidation, including confidence/reasoning/traced-to continuity policies.

## WS-06 Risk and Readiness
Deliverables:
- `DataMigrationRiskRegister.md`
- `SQLConsolidationReadinessReview.md`

Objective:
- classify migration risks, define gating criteria, and evaluate readiness against mandatory thresholds.

---

## 6. Execution Phases

### Phase P1 — Inventory and Mapping
- Build canonical-to-physical table map.
- Build legacy alias and duplicate candidate map.
- Record unresolved mapping ambiguities.

### Phase P2 — Structural Reconciliation Planning
- Plan table-level convergence and naming normalization.
- Plan column-level conflict handling.
- Define no-loss consolidation paths.

### Phase P3 — Constraint and Index Reconciliation Planning
- Plan constraint standard convergence.
- Plan index standard convergence.
- Identify ordering and dependency implications.

### Phase P4 — Audit/Versioning/Explainability Reconciliation Planning
- Align lifecycle/audit/versioning behavior.
- Align decision/trace persistence continuity.
- Confirm no lineage loss path.

### Phase P5 — Risk and Readiness Gate Review
- Finalize risk register.
- Run mandatory validation phases A–F.
- Compute readiness and classification.

---

## 7. Mapping and Conflict Taxonomy

## 7.1 Mapping classes
- M1: Canonical = Physical exact match
- M2: Canonical maps to legacy alias
- M3: Canonical maps to multiple physical artifacts
- M4: Canonical planned-only (no physical table yet)
- M5: Physical orphan candidate (no canonical target)

## 7.2 Column conflict classes
- C1: Name drift only
- C2: Data type/semantic drift
- C3: Nullability drift
- C4: Constraint drift
- C5: Ownership-sensitive field conflict
- C6: Audit/versioning field drift
- C7: Explainability lineage field drift

---

## 8. Governance Guardrails

1. Do not modify WP-01/WP-02 baseline documents.
2. Any conflicting interpretation must be recorded, not “fixed” in-place.
3. No migration order claims without dependency rationale.
4. No recommendation may violate ownership/boundary/event canonical rules.
5. All consolidation proposals must remain reversible by design.

---

## 9. Deliverable Checklist (WP-03)

- [ ] PhysicalTableMappingMatrix.md
- [ ] CanonicalToLegacyMapping.md
- [ ] ConstraintMigrationStrategy.md
- [ ] IndexMigrationStrategy.md
- [ ] AuditAndVersioningMigrationStrategy.md
- [ ] ExplainabilityPersistenceStrategy.md
- [ ] DataMigrationRiskRegister.md
- [ ] SQLConsolidationReadinessReview.md

---

## 10. Mandatory Validation Gates

Before WP-03 completion:
- Phase A: Physical Mapping Audit
- Phase B: Constraint Migration Audit
- Phase C: Index Migration Audit
- Phase D: Audit & Versioning Migration Audit
- Phase E: Explainability Migration Audit
- Phase F: Cross-Document Consistency Audit

Approval thresholds:
- No Critical issues
- No High issues
- Mapping Integrity ≥ 95
- Constraint Migration Integrity ≥ 95
- Explainability Integrity ≥ 95
- Migration Readiness ≥ 95
- Cross-Document Consistency ≥ 95

---

## 11. Success Criteria

WP-03 is successful when:
1. Canonical model is fully mapped to physical baseline with explicit classifications.
2. Constraint/index/audit/versioning/explainability migration strategies are complete and coherent.
3. Risks are classified with controls and non-blocking residuals only.
4. All validation gates pass and final classification reaches READY_FOR_PHYSICAL_SCHEMA_PLANNING.
