# Data Migration Risk Register (WP-03 Planning)

## 1. Purpose

Capture planning-stage risks for physical schema consolidation from Batch 0–5 baseline to canonical governance target.

Scope:
- migration planning risks only
- no execution actions
- no SQL scripts

---

## 2. Risk Rating Model

Severity:
- Critical
- High
- Medium
- Low

Probability:
- High / Medium / Low

Risk score guidance:
- Critical or High severity risks are blockers for READY classification unless mitigated/closed.

---

## 3. Risk Register

| Risk ID | Category | Description | Severity | Probability | Impact | Mitigation Strategy | Residual Status |
|---|---|---|---|---|---|---|---|
| RSK-WP03-001 | Mapping | Planned canonical entities (`learner_goal`, `goal_progress`) have no confirmed physical parity in Batch 0–5 | Medium | Medium | Ambiguity in physical consolidation scope | Keep explicit Planned classification; exclude from physical migration assumptions | Open (tracked) |
| RSK-WP03-002 | Ownership | Potential ownership drift if mapping aliases are interpreted as write-owner transfer | High | Low | Boundary violation risk | Enforce single-owner checks against WP-01 matrices in readiness gate | Mitigated (guarded) |
| RSK-WP03-003 | Constraint | Constraint naming/semantic drift could cause mismatch between physical and canonical standards | Medium | Medium | Migration complexity and verification overhead | Use canonical naming normalization map + constraint action classes | Open (controlled) |
| RSK-WP03-004 | Index | Redundant index removal planning may accidentally reduce hot-path coverage | High | Low | Query performance regression risk | Preserve replacement coverage-first policy; perform index audit gate | Mitigated (guarded) |
| RSK-WP03-005 | Audit | Inconsistent actor/audit metadata across table classes may reduce traceability | Medium | Medium | Forensic and governance audit gaps | Apply lifecycle-class audit normalization strategy | Open (controlled) |
| RSK-WP03-006 | Versioning | Mutable vs append-only confusion can introduce lineage inconsistency | High | Low | Historical integrity risk | Enforce canonical lifecycle versioning policy and contradiction checks | Mitigated (guarded) |
| RSK-WP03-007 | Explainability | Trace/reasoning/confidence semantics may be degraded by naming/field reconciliation | Critical | Low | Explainability lineage loss risk | Preserve mandatory explainability semantic set and no-loss controls | Mitigated (guarded) |
| RSK-WP03-008 | Event/Decision | Derived decision events could be misused as canonical lineage roots | High | Low | Event persistence ambiguity | Enforce canonical event rule (`DecisionRegistered` only) in audits | Mitigated (guarded) |
| RSK-WP03-009 | Sequence | Improper migration sequence planning may create transient invalid states | Medium | Medium | Temporary integrity failures in future execution | Dependency-safe ordering guidance in strategies and readiness gates | Open (controlled) |
| RSK-WP03-010 | Orphan Detection | Hidden orphan physical tables outside mapped scope | Medium | Low | Incomplete consolidation plan | Require full DDL inventory reconciliation in readiness review checklist | Open (controlled) |
| RSK-WP03-011 | Duplicate Targets | Duplicate consolidation target interpretation for semantically similar tables | Medium | Low | Consolidation ambiguity | Maintain explicit table-purpose and owner mapping with conflict classing | Open (controlled) |
| RSK-WP03-012 | Cross-Doc Consistency | Contradictory wording across strategy docs | High | Low | Planning misinterpretation | Mandatory Phase F cross-document audit | Mitigated (guarded) |

---

## 4. Blocker Criteria

A risk is blocking if:
1. Severity is Critical and unresolved, or
2. Severity is High and unresolved at readiness gate, or
3. It implies ownership/boundary/event canonicalization violation.

---

## 5. Risk Treatment Summary

| Treatment Status | Count |
|---|---:|
| Mitigated (guarded by strategy/gates) | 6 |
| Open (controlled, non-blocking in planning stage) | 6 |
| Unmitigated Critical | 0 |
| Unmitigated High | 0 |

---

## 6. Watchlist (Post-WP-03 Follow-up)

1. Planned canonical table physical adoption path clarity.
2. Full physical orphan table detection in exhaustive inventory stage.
3. Execution-stage validation of index and constraint sequencing assumptions.
4. Explainability taxonomy evolution governance when target/source types expand.

---

## 7. Risk Governance Rules

1. No unresolved Critical/High risk allowed for final READY classification.
2. All Medium/Low residual risks must have explicit controls.
3. Risk IDs must be referenced in readiness review outcomes.
4. Risk register updates require change-control review after WP-03 freeze.

---

## 8. Alignment References

- `PhysicalSchemaConsolidationPlan.md`
- `ConstraintMigrationStrategy.md`
- `IndexMigrationStrategy.md`
- `AuditAndVersioningMigrationStrategy.md`
- `ExplainabilityPersistenceStrategy.md`
- `SQLConsolidationReadinessReview.md`
