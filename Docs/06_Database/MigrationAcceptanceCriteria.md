# Migration Acceptance Criteria (WP-04)

## 1. Purpose

Define formal acceptance criteria for migration execution readiness and controlled completion.

This is governance criteria documentation only.

---

## 2. Acceptance Levels

- AL-0: Not Ready
- AL-1: Ready for Controlled Preparation
- AL-2: Ready for Governed Execution Window
- AL-3: Ready for Cutover Completion

WP-04 target: AL-1/AL-2 planning readiness (no execution in this phase).

---

## 3. Mandatory Acceptance Dimensions

1. Migration Integrity
2. Rollback Integrity
3. Validation Integrity
4. Cutover Integrity
5. Cross-Document Consistency

---

## 4. Gate Thresholds

Required thresholds:
- No Critical issues
- No High issues
- Migration Integrity ≥ 95
- Rollback Integrity ≥ 95
- Validation Integrity ≥ 95
- Cutover Integrity ≥ 95
- Cross-Document Consistency ≥ 95

Failure of any threshold => classification cannot be READY.

---

## 5. Criteria by Audit Phase

## Phase A — Migration Sequence Audit
Pass if:
1. sequence is explicit, ordered, dependency-safe,
2. no bypass of mandatory gates,
3. no unresolved sequence contradiction.

## Phase B — Dependency Audit
Pass if:
1. dependency matrix is complete,
2. no unresolved Critical/High dependency conflicts,
3. no circular blocking dependency.

## Phase C — Rollback Audit
Pass if:
1. rollback triggers and checkpoints are complete,
2. rollback authority and decision flow are explicit,
3. rollback verification strategy is defined.

## Phase D — Validation & Verification Audit
Pass if:
1. mandatory validation suites defined across stages,
2. severity/disposition rules coherent,
3. evidence requirements complete and traceable.

## Phase E — Cutover Audit
Pass if:
1. cutover entry/exit criteria explicit,
2. stop/abort conditions explicit,
3. stabilization and post-cutover checks defined.

## Phase F — Cross-Document Consistency Audit
Pass if:
1. terminology and assumptions consistent,
2. no contradictions between plan/runbook/rollback/validation/cutover docs,
3. acceptance thresholds referenced consistently.

---

## 6. Scorecard Template

| Dimension | Score | Threshold | Result |
|---|---:|---:|---|
| Migration Integrity | 0 | 95 | Pending |
| Rollback Integrity | 0 | 95 | Pending |
| Validation Integrity | 0 | 95 | Pending |
| Cutover Integrity | 0 | 95 | Pending |
| Cross-Document Consistency | 0 | 95 | Pending |

Blocking issue counters:
- Critical: 0 (pending)
- High: 0 (pending)

---

## 7. Evidence Requirements

Acceptance decision must reference:
1. all Phase A–F audit outputs,
2. issue severity summary,
3. scorecard with threshold comparison,
4. residual risks and mitigations,
5. final recommendation and classification.

---

## 8. Acceptance Decision Logic

- READY_FOR_MIGRATION_EXECUTION_PREPARATION:
  all mandatory thresholds pass, no Critical/High issues.
- NEEDS_REVISION:
  any threshold fails or Critical/High issue exists.
- HOLD:
  insufficient evidence or unresolved dependency ambiguity.

---

## 9. Non-Negotiable Controls

1. Ownership and boundary model cannot be weakened.
2. Explainability and decision lineage cannot be degraded.
3. Rollback viability must remain intact through cutover.
4. Acceptance cannot be granted based on partial audits.

---

## 10. Alignment References

- `MigrationExecutionPlan.md`
- `MigrationRunbook.md`
- `RollbackStrategy.md`
- `DataValidationStrategy.md`
- `CutoverPlan.md`
- `MigrationDependencyMatrix.md`
- `MigrationRiskControlPlan.md`
- `MigrationReadinessReview.md`
