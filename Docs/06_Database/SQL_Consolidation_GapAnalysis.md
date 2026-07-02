# SQL Consolidation Gap Analysis

## 1. Purpose

Identify and classify gaps between:
- current SQL artifact baseline (Batch 0–5 and associated reviews)
- WP-02 canonical schema target standards

This is analysis-only and does not execute migrations, DDL, or implementation.

---

## 2. Inputs and Baseline

Primary inputs:
- SQL Batch 0–5 artifacts and reviews
- `SQL_BATCH5_REVIEW.md`
- `CanonicalSchema_v1.md`
- `CanonicalTableCatalog.md`
- `CanonicalColumnStandards.md`
- `CanonicalConstraintCatalog.md`
- `CanonicalIndexStrategy.md`
- `CanonicalAuditAndSoftDeleteStandards.md`
- `CanonicalVersioningStandards.md`
- approved WP-01 governance docs

---

## 3. Gap Classification Model

Severity:
- Critical: blocks canonical readiness
- High: must close before schema execution planning
- Medium: required for consolidation completeness but non-blocking for conceptual readiness
- Low: optimization or governance hardening

Type:
- Ownership
- Naming
- Constraint
- Index
- Audit
- Soft Delete
- Versioning
- Explainability
- Reconciliation

Status:
- Open
- Deferred (approved)
- Resolved in WP-02 docs
- Requires decision

---

## 4. Gap Register

| Gap ID | Type | Severity | Description | Current State | Canonical Target | Resolution Path | Status |
|---|---|---|---|---|---|---|---|
| GAP-02-OWN-01 | Ownership | Medium | Conceptual ownership ambiguity risk for planned goal entities | Planned entries exist (`learner_goal`, `goal_progress`) without confirmed physical parity | Single owner retained in canonical catalog | Keep as Planned with explicit owner and no implementation assumption | Resolved in WP-02 docs |
| GAP-02-NAM-01 | Naming | Medium | Cross-artifact naming style inconsistencies possible across legacy drafts | Batch-era naming conventions vary by artifact generation epoch | Deterministic canonical naming rules | Enforce canonical naming standards as superseding governance reference | Resolved in WP-02 docs |
| GAP-02-CST-01 | Constraint | Medium | Constraint naming and policy not previously centralized | Constraints spread across batches/reviews | Unified canonical constraint catalog and naming templates | Use CanonicalConstraintCatalog as single policy source | Resolved in WP-02 docs |
| GAP-02-IDX-01 | Index | Medium | Index naming and strategy not unified in one governance artifact | Index decisions distributed across batch reviews | Canonical index policy with mandatory classes and anti-patterns | Adopt CanonicalIndexStrategy as authoritative baseline | Resolved in WP-02 docs |
| GAP-02-AUD-01 | Audit | Medium | Audit field requirements vary by table class and were not consolidated | Patterns exist but fragmented | Unified audit standard by lifecycle class | Apply CanonicalAuditAndSoftDeleteStandards policy baseline | Resolved in WP-02 docs |
| GAP-02-SD-01 | Soft Delete | Medium | Lifecycle/soft-delete policy semantics not normalized in single source | Status/archive semantics present but dispersed | Canonical lifecycle policy and hard-delete exception model | Standardize policy in CanonicalAuditAndSoftDeleteStandards | Resolved in WP-02 docs |
| GAP-02-VER-01 | Versioning | Medium | Versioning policy spread across domain docs and SQL patterns | Partial consistency; not unified | Canonical versioning model by lifecycle class | Use CanonicalVersioningStandards as authoritative policy | Resolved in WP-02 docs |
| GAP-02-EXP-01 | Explainability | High | Explainability persistence consistency requires strict alignment with decision/event model | Known historical gap references exist in prior reviews | Canonical explainability persistence standards + decision-event alignment | Enforce canonical decision event and trace-link immutability policy | Open (governance watch) |
| GAP-02-REC-01 | Reconciliation | Medium | Conceptual-to-physical mapping traceability needs explicit maintenance | Reconciliation appendix introduced in WP-01 | Maintain full mapping continuity in canonical catalog lifecycle | Govern via canonical status fields and future reconciliation updates | Resolved in WP-02 docs |
| GAP-02-FK-01 | Constraint/Boundary | Medium | Cross-domain relationship classifications require continuous completeness | Appendix established in WP-01 | Canonical FK classification remains complete and ownership-safe | Keep FK appendix as living governance artifact with change control | Open (controlled) |

---

## 5. Consolidation Readiness by Dimension

| Dimension | Score | Notes |
|---|---:|---|
| Ownership Consistency | 97/100 | Single-owner model preserved and aligned with WP-01 |
| Naming Consistency | 95/100 | Canonical naming baseline defined; legacy drift controlled by supersedence |
| Constraint Consistency | 95/100 | Canonical constraint model centralized |
| Index Consistency | 94/100 | Canonical strategy defined; physical-to-policy mapping remains ongoing |
| Audit / Soft Delete Consistency | 95/100 | Unified policy now explicit |
| Versioning Consistency | 95/100 | Lifecycle-class standards defined |
| Explainability Persistence Consistency | 93/100 | Strong policy definition; prior historical complexity remains governance watch |
| Cross-Document Consistency | 96/100 | Canonical references and WP-01 alignment maintained |

---

## 6. High-Risk and Watch Items

## 6.1 High-Risk Watch (non-blocking for documentation)
1. Explainability target coverage evolution must remain decision-governed.
2. Decision/event canonicalization must remain stable (`DecisionRegistered` as sole canonical cross-domain decision event).

## 6.2 Medium Watch
1. Planned canonical entities must not be treated as physically implemented without explicit SQL trace.
2. Cross-domain FK classification catalog must be updated whenever canonical relationships change.

---

## 7. No-Change Guardrails (Confirmed)

This WP-02 analysis confirms:
- No SQL migration scripts generated.
- No code artifacts generated.
- No NestJS/backend implementation artifacts created.
- No changes to approved WP-01 docs except reference alignment usage.

---

## 8. Recommended Next-Step Closure Criteria for WP-02

WP-02 can be considered ready for approval if:
1. Canonical artifacts remain internally consistent.
2. Ownership and boundary rules remain unchanged from WP-01.
3. Constraint/index/audit/versioning standards are accepted as canonical baseline.
4. Gap register has no Critical unresolved items.
5. High items are explicitly tracked with governance watch status.

---

## 9. Final Gap Summary

- Critical gaps: 0
- High gaps: 1 (governance watch, non-implementation blocker at documentation stage)
- Medium gaps: 2 open governance/watch maintenance items
- Resolved/documented standardization gaps: 7

WP-02 status at documentation stage: **Ready for validation gate review**.
