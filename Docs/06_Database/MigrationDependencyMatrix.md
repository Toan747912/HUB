# Migration Dependency Matrix (WP-04)

## 1. Purpose

Define migration dependency graph for execution preparation:
- sequencing dependencies
- gate dependencies
- rollback dependencies
- validation dependencies
- cutover dependencies

No migration commands are executed.

---

## 2. Dependency Groups

- DG-01: Governance Baseline Dependencies
- DG-02: Mapping and Structural Dependencies
- DG-03: Constraint and Index Dependencies
- DG-04: Audit/Versioning and Explainability Dependencies
- DG-05: Validation and Acceptance Dependencies
- DG-06: Rollback and Cutover Dependencies

---

## 3. Dependency Matrix

| Item ID | Dependency Item | Depends On | Dependency Type | Criticality | Notes |
|---|---|---|---|---|---|
| D-001 | MigrationExecutionPlan | WP-01/02/03 approved baselines | Governance | High | Entry point artifact |
| D-002 | MigrationRunbook | MigrationExecutionPlan | Operational | High | Stage execution control |
| D-003 | RollbackStrategy | MigrationExecutionPlan + Runbook | Risk Control | High | Required before cutover |
| D-004 | DataValidationStrategy | MigrationExecutionPlan + Runbook | Validation | High | Required for all gates |
| D-005 | CutoverPlan | Runbook + Rollback + Validation | Operational | High | Cutover gating |
| D-006 | MigrationAcceptanceCriteria | Validation + Risk controls | Governance | High | Final pass/fail logic |
| D-007 | MigrationRiskControlPlan | WP-03 risk baseline + WP-04 plans | Risk | High | Severity handling authority |
| D-008 | MigrationReadinessReview | All WP-04 documents | Governance | Critical | Final classification source |
| D-009 | Sequence Audit (Phase A) | D-001, D-002 | Validation | High | Must pass first |
| D-010 | Dependency Audit (Phase B) | D-001..D-008 matrix alignment | Validation | High | Detect sequence conflicts |
| D-011 | Rollback Audit (Phase C) | D-003 + D-002 + D-005 | Validation | Critical | No rollback = no go |
| D-012 | Validation Audit (Phase D) | D-004 + D-006 | Validation | High | Verify acceptance integrity |
| D-013 | Cutover Audit (Phase E) | D-005 + D-003 + D-004 | Validation | High | Verify cutover viability |
| D-014 | Cross-Doc Audit (Phase F) | All docs consistency | Validation | High | Detect contradiction |
| D-015 | Final Gate Evaluation | D-009..D-014 results | Governance | Critical | Ready vs needs revision |

---

## 4. Execution Dependency Order

1. Governance baseline lock (WP-01..WP-03)
2. Migration execution governance artifacts (plan + runbook)
3. Rollback and validation artifacts
4. Cutover and acceptance/risk artifacts
5. Readiness review synthesis
6. Phase A-F audit completion
7. Gate threshold evaluation
8. Final classification issuance

---

## 5. Dependency Conflict Rules

Conflict if:
1. downstream artifact assumes capability not present upstream.
2. rollback depends on undefined checkpoint.
3. cutover criteria references undefined validation evidence.
4. readiness review threshold references missing score dimensions.
5. sequence implies bypass of required gate.

Any conflict above High severity blocks readiness.

---

## 6. Shared Dependency Anchors

Shared anchors inherited from prior baselines:
- ownership matrix and boundary controls
- canonical schema and standards
- consolidation planning and risk register
- explainability/decision lineage controls

No WP-04 artifact may redefine these anchors.

---

## 7. Dependency Integrity Criteria

Dependency integrity is considered ready when:
- all High/Critical dependency paths are closed,
- no circular blocking dependency remains,
- all mandatory audit phases can be executed without missing artifact inputs.

---

## 8. Alignment References

- `MigrationExecutionPlan.md`
- `MigrationRunbook.md`
- `RollbackStrategy.md`
- `DataValidationStrategy.md`
- `CutoverPlan.md`
- `MigrationAcceptanceCriteria.md`
- `MigrationRiskControlPlan.md`
- `MigrationReadinessReview.md`
