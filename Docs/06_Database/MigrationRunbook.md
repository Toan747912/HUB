# Migration Runbook (WP-04)

## 1. Purpose

Operational runbook template for executing governed schema consolidation migration activities once execution is authorized.

This runbook is preparation-only:
- no execution in this phase
- no SQL in this document

---

## 2. Runbook Operating Principles

1. Follow approved sequence only.
2. No ad-hoc changes during migration window.
3. Every step requires checkpoint evidence.
4. Stop immediately on Critical/High anomaly.
5. Rollback authority can trigger rollback without delay.

---

## 3. Roles and Responsibilities

- Migration Coordinator: sequence control and status calls
- Executor: performs authorized execution tasks
- Validator: performs checkpoint validation tasks
- Rollback Authority: approves rollback triggers
- Governance Observer: ensures boundary/ownership compliance
- Cutover Commander: directs cutover stage transitions

---

## 4. Runbook Lifecycle

### Phase R0 — Pre-Window Readiness
Checklist:
- all planning artifacts approved
- gate prerequisites satisfied
- communication channels verified
- rollback plan verified
- validation queries/checklists prepared

Output:
- Go/No-Go pre-window decision

### Phase R1 — Execution Window Start
Checklist:
- freeze confirmation
- baseline snapshot confirmation
- sequence ID and run ID issued
- stage timers started

Output:
- controlled execution start authorization

### Phase R2 — Wave Execution
Per-wave actions:
1. announce wave start
2. execute planned migration unit(s)
3. run immediate validation checks
4. document anomalies
5. approve wave completion or trigger stop

Output:
- wave completion evidence package

### Phase R3 — Post-Wave Verification
Checklist:
- structural validation
- data parity/consistency checks
- decision/trace lineage checks
- performance sanity checks (if applicable)

Output:
- wave sign-off or rollback escalation

### Phase R4 — Cutover and Stabilization
Checklist:
- cutover preconditions
- cutover switch actions (logical)
- post-cutover validation checks
- stabilization monitoring interval

Output:
- final acceptance package or rollback action

---

## 5. Checkpoint Templates

## CP-Template-01: Pre-Execution
- checkpoint id
- timestamp
- gate status
- blockers (if any)
- sign-off owner

## CP-Template-02: In-Wave Validation
- wave id
- migration unit id
- validation checks run
- pass/fail
- issue severity

## CP-Template-03: Post-Wave
- parity status
- constraint/index status
- lineage status
- proceed/hold decision

## CP-Template-04: Cutover Completion
- cutover completion timestamp
- post-cutover checks
- stabilization status
- final decision

---

## 6. Incident and Escalation Protocol

Severity handling:
- Critical: immediate STOP, rollback evaluation
- High: pause progression, governance review required
- Medium: proceed with mitigation if approved
- Low: log and monitor

Escalation path:
1. Executor -> Migration Coordinator
2. Migration Coordinator -> Rollback Authority + Governance Observer
3. sign-off authority decides continue/rollback/abort

---

## 7. Runbook Stop Conditions

Stop execution if:
1. ownership or boundary violation detected,
2. explainability lineage loss path detected,
3. rollback path unavailable,
4. unresolved Critical/High issue emerges,
5. validation parity failure crosses threshold.

---

## 8. Runbook Resume Conditions

Resume only when:
1. root cause understood/documented,
2. mitigation approved,
3. rollback contingency re-validated,
4. gate owner signs resume authorization.

---

## 9. Evidence and Audit Logging Requirements

Each stage must record:
- who executed
- what was executed
- when executed
- validation result
- decision to continue/pause/rollback
- references to risk IDs where relevant

Runbook evidence must map to:
- MigrationAcceptanceCriteria
- MigrationRiskControlPlan
- MigrationReadinessReview

---

## 10. Runbook Completion Criteria

Runbook cycle is complete when:
1. all waves executed or intentionally aborted with traceable decision,
2. post-cutover checks complete,
3. no unresolved Critical/High issue remains,
4. acceptance criteria are signed off.

---

## 11. Alignment References

- `MigrationExecutionPlan.md`
- `RollbackStrategy.md`
- `DataValidationStrategy.md`
- `CutoverPlan.md`
- `MigrationDependencyMatrix.md`
- `MigrationAcceptanceCriteria.md`
- `MigrationRiskControlPlan.md`
- `MigrationReadinessReview.md`
