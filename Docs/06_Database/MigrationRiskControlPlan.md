# Migration Risk Control Plan (WP-04)

## 1. Purpose

Define risk control framework for migration execution preparation:
- risk classification and response
- control points and monitoring
- escalation and decision authority
- linkage to rollback and acceptance gates

Documentation-only; no active risk operations in this phase.

---

## 2. Risk Control Principles

1. Prevention-first, rollback-ready always.
2. Severity-driven action with explicit authority.
3. No unresolved Critical/High risk allowed for READY classification.
4. Risk controls must map to validation and cutover checkpoints.
5. Every risk disposition must be evidence-backed.

---

## 3. Risk Categories

- RC-01 Sequence and Dependency Risk
- RC-02 Structural/Constraint Risk
- RC-03 Index and Performance Coverage Risk
- RC-04 Ownership/Boundary Governance Risk
- RC-05 Audit/Versioning Integrity Risk
- RC-06 Explainability/Decision Lineage Risk
- RC-07 Cutover and Operational Transition Risk
- RC-08 Cross-Document Consistency Risk

---

## 4. Severity and Action Matrix

| Severity | Action | Progression Rule |
|---|---|---|
| Critical | Immediate STOP + rollback evaluation | No progression |
| High | Pause and corrective action required | Progression blocked until closure |
| Medium | Controlled mitigation with explicit approval | Conditional progression |
| Low | Log and monitor | Progression allowed |

---

## 5. Control Points

Risk control checkpoints:
- RCP-01 Pre-flight risk review
- RCP-02 Pre-wave risk confirmation
- RCP-03 Post-wave risk reassessment
- RCP-04 Pre-cutover risk confirmation
- RCP-05 Post-cutover stabilization risk review

Each checkpoint requires:
- active risk summary
- new risk intake
- severity updates
- disposition decisions
- approval signatures

---

## 6. Core Control Rules

1. Ownership/boundary violation risk is always High or Critical.
2. Explainability lineage break risk is always Critical.
3. Rollback unavailability risk is always Critical.
4. Unresolved dependency cycle risk is High minimum.
5. Acceptance-threshold failure is High minimum until resolved.

---

## 7. Risk Register Operations (Planning)

For each risk:
- Risk ID
- Category
- Description
- Trigger condition
- Detection checkpoint
- Severity
- Mitigation action
- Owner
- Status
- Residual severity

Status values:
- Open
- Mitigating
- Resolved
- Accepted (Medium/Low only with approval)

---

## 8. Escalation Model

Escalation chain:
1. Validator/Executor identifies risk
2. Migration Coordinator validates severity
3. Rollback Authority + Governance Observer review
4. Sign-off Authority decides continue/pause/rollback/abort

Escalation SLA guidance:
- Critical: immediate
- High: before next stage
- Medium/Low: before checkpoint close

---

## 9. Risk-to-Gate Mapping

| Gate Dimension | Controlling Risk Categories |
|---|---|
| Migration Integrity | RC-01, RC-02, RC-03 |
| Rollback Integrity | RC-01, RC-07 |
| Validation Integrity | RC-02, RC-04, RC-05, RC-06 |
| Cutover Integrity | RC-07, RC-01 |
| Cross-Document Consistency | RC-08 |

---

## 10. Risk Readiness Criteria

Risk control plan is ready when:
1. all risk categories are covered,
2. severity/action matrix is explicit,
3. escalation and ownership are defined,
4. risk-to-gate mapping is complete,
5. no unresolved Critical/High control design issue remains.

---

## 11. Alignment References

- `MigrationExecutionPlan.md`
- `MigrationRunbook.md`
- `RollbackStrategy.md`
- `DataValidationStrategy.md`
- `CutoverPlan.md`
- `MigrationAcceptanceCriteria.md`
- `MigrationReadinessReview.md`
