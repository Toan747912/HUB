# Rollback Strategy (WP-04)

## 1. Purpose

Define rollback governance and execution-preparation strategy for consolidation migration waves.

This is documentation-only:
- no rollback execution
- no SQL scripts
- no runtime changes

---

## 2. Rollback Principles

1. Rollback must be pre-authorized and dependency-aware.
2. Rollback decision points must be explicit at every migration wave.
3. No progression without validated rollback path.
4. Rollback actions must preserve audit and explainability lineage.
5. Rollback should minimize blast radius and preserve data integrity.

---

## 3. Rollback Trigger Classes

## 3.1 Immediate rollback triggers (Critical)
- ownership/boundary violation detected
- irrecoverable explainability lineage break
- severe data integrity corruption signals
- inability to continue with validated sequence dependencies

## 3.2 Conditional rollback triggers (High)
- repeated validation failures
- inability to satisfy acceptance criteria for current wave
- migration dependency deadlock or unresolved sequence conflict
- rollback safety uncertainty

## 3.3 Hold-and-assess triggers (Medium)
- isolated parity mismatch with known mitigation path
- non-blocking performance regressions
- documentation evidence mismatch pending correction

---

## 4. Rollback Decision Governance

Decision authorities:
- Migration Coordinator (initiates escalation)
- Rollback Authority (approval owner)
- Governance Observer (boundary/ownership guard)
- Sign-off Authority (final disposition)

Decision outcomes:
- CONTINUE_WITH_MITIGATION
- PAUSE_FOR_CORRECTION
- PARTIAL_ROLLBACK
- FULL_ROLLBACK
- ABORT_WINDOW

---

## 5. Rollback Scope Model

Rollback scope levels:
1. Unit rollback (single migration unit)
2. Wave rollback (current wave)
3. Multi-wave rollback (to known safe checkpoint)
4. Full-window rollback (to baseline checkpoint)

Selection criteria:
- anomaly severity
- dependency impact radius
- parity state
- lineage risk exposure

---

## 6. Rollback Checkpoints

Mandatory rollback checkpoints:
- RB-CP1: pre-window safe baseline checkpoint
- RB-CP2: pre-wave checkpoint
- RB-CP3: post-wave validation checkpoint
- RB-CP4: pre-cutover checkpoint
- RB-CP5: post-cutover stabilization checkpoint

Each checkpoint records:
- state reference
- dependency state
- validation evidence
- rollback eligibility status

---

## 7. Rollback Readiness Checklist

Before execution start:
1. rollback ownership assignments confirmed
2. rollback trigger matrix approved
3. rollback communication path tested
4. rollback verification criteria documented
5. rollback evidence template prepared

Before each wave:
1. checkpoint captured
2. dependencies verified
3. parity baseline confirmed
4. rollback path still valid

---

## 8. Data Integrity and Lineage Safeguards

Rollback must guarantee:
1. no silent loss of decision header/detail lineage
2. no silent loss of trace_link explainability graph semantics
3. no ownership drift introduced by rollback logic
4. no unresolved state machine contradictions post-rollback

---

## 9. Rollback Verification Strategy

After rollback (planning requirements):
1. structural integrity checks
2. ownership/boundary integrity checks
3. data parity checks for rolled-back scope
4. decision/explainability continuity checks
5. readiness-to-resume assessment

Rollback completion requires explicit verification sign-off.

---

## 10. Resume-after-Rollback Conditions

Resume permitted only if:
1. root cause documented and mitigated
2. rollback verification passed
3. dependency matrix revalidated
4. acceptance criteria re-acknowledged
5. authorization reissued

---

## 11. Rollback Risk Controls

Controls:
- no irreversible operation without pre-validated fallback logic
- explicit stop points before high-coupling transitions
- segregation of rollback decision authority from execution actor
- mandatory incident log and evidence package for every rollback trigger

---

## 12. Rollback Readiness Criteria

Rollback strategy is ready when:
- rollback paths defined for all migration waves,
- trigger classes and authority model approved,
- checkpoints and verification criteria are complete,
- no unresolved Critical/High rollback integrity issue remains.

---

## 13. Alignment References

- `MigrationExecutionPlan.md`
- `MigrationRunbook.md`
- `MigrationDependencyMatrix.md`
- `DataValidationStrategy.md`
- `CutoverPlan.md`
- `MigrationRiskControlPlan.md`
- `MigrationReadinessReview.md`
