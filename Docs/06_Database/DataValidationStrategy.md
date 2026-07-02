# Data Validation Strategy (WP-04)

## 1. Purpose

Define end-to-end validation and verification strategy for migration execution preparation.

Validation scope:
- structural integrity
- ownership and boundary integrity
- data parity and consistency
- decision/explainability lineage continuity
- acceptance criteria verification

No execution SQL is included.

---

## 2. Validation Principles

1. Validation gates must be objective and repeatable.
2. Validation must be stage-aware (pre, in-wave, post-wave, cutover).
3. Validation must include both technical and governance dimensions.
4. Critical integrity dimensions (ownership, lineage, constraints) are non-negotiable.
5. Validation failure handling must be tied to rollback governance.

---

## 3. Validation Dimensions

1. Structural Integrity
2. Constraint Integrity
3. Index Coverage Integrity
4. Ownership/Boundary Integrity
5. Versioning/Lifecycle Integrity
6. Explainability/Decision Lineage Integrity
7. Cross-Document and Governance Integrity

---

## 4. Validation Stages

## Stage V0 — Pre-Execution Validation
- baseline snapshot confirmation
- migration dependency check
- readiness checklist validation

## Stage V1 — In-Wave Validation
- unit-level structural checks
- immediate parity checks
- anomaly severity classification

## Stage V2 — Post-Wave Validation
- aggregate integrity checks
- ownership/boundary and constraint checks
- event/lineage consistency checks

## Stage V3 — Pre-Cutover Validation
- full acceptance criteria pre-check
- rollback readiness reconfirmation
- cutover dependency completeness check

## Stage V4 — Post-Cutover Validation
- stabilization checks
- final parity checks
- final governance compliance checks

---

## 5. Validation Check Suites

## Suite A — Structural
- expected objects present
- disallowed objects absent
- naming normalization status aligned

## Suite B — Constraint/Index
- required constraints effective
- canonical naming expectations met
- index coverage and hot-path safeguards preserved

## Suite C — Ownership/Boundary
- single write-owner model preserved
- no forbidden cross-domain write paths
- recommendation/teaching/session/assessment rules preserved

## Suite D — Versioning/Lifecycle
- mutable vs append-only behavior assumptions preserved
- lifecycle state semantics coherent
- audit/versioning fields satisfy policy expectations

## Suite E — Explainability/Decision Lineage
- decision envelope continuity preserved
- trace graph continuity preserved
- reasoning/confidence/traced linkage semantics preserved

---

## 6. Severity and Disposition Rules

Severity:
- Critical: immediate rollback evaluation
- High: pause progression until resolved
- Medium: controlled mitigation allowed with explicit approval
- Low: monitor/log

Disposition outcomes:
- PASS
- PASS_WITH_CONDITION
- HOLD
- FAIL_AND_ROLLBACK_REVIEW

---

## 7. Validation Evidence Requirements

Each validation checkpoint must capture:
- validation suite ID
- timestamp
- scope
- pass/fail per check
- anomaly list with severity
- disposition and approver

Evidence must reference:
- runbook stage
- risk IDs (if applicable)
- acceptance criteria IDs

---

## 8. Validation Coverage Matrix (Planning)

| Stage | Structural | Constraint/Index | Ownership/Boundary | Versioning | Explainability | Acceptance |
|---|---|---|---|---|---|---|
| V0 | Yes | Yes | Yes | Yes | Yes | Baseline pre-check |
| V1 | Yes | Partial | Yes | Partial | Partial | Unit-level |
| V2 | Yes | Yes | Yes | Yes | Yes | Wave-level |
| V3 | Yes | Yes | Yes | Yes | Yes | Cutover-ready |
| V4 | Yes | Yes | Yes | Yes | Yes | Final acceptance |

---

## 9. Failure Handling and Retest Policy

1. Failed checks must be classified and logged.
2. Critical/High failures require re-validation after mitigation.
3. Resume only with authorized disposition.
4. Repeated failure on same control point escalates severity.

---

## 10. Validation Readiness Criteria

Validation strategy is ready when:
- all mandatory suites are defined for every stage,
- severity/disposition rules are explicit,
- evidence requirements are standardized,
- linkage to rollback/cutover/acceptance criteria is complete.

---

## 11. Alignment References

- `MigrationExecutionPlan.md`
- `MigrationRunbook.md`
- `RollbackStrategy.md`
- `CutoverPlan.md`
- `MigrationAcceptanceCriteria.md`
- `MigrationRiskControlPlan.md`
- `MigrationReadinessReview.md`
