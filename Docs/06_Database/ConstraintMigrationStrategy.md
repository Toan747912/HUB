# Constraint Migration Strategy (WP-03 Planning)

## 1. Purpose

Define planning strategy to reconcile existing physical constraints (Batch 0–5) with canonical constraint standards.

This is documentation-only:
- no SQL statements
- no migration scripts
- no execution order commands

---

## 2. Strategy Goals

1. Align all physical constraints with canonical PK/FK/UQ/CK standards.
2. Preserve ownership and boundary decisions from WP-01/WP-02.
3. Prevent referential regressions during future migration execution.
4. Normalize constraint naming deterministically.
5. Keep explainability and decision lineage constraints intact.

---

## 3. Constraint Migration Classification

For each physical constraint, classify action:

- KEEP_AS_IS
- RENAME_TO_CANONICAL
- TIGHTEN_RULE
- RELAX_RULE
- ADD_MISSING (planning only)
- DEPRECATE_REDUNDANT
- REQUIRES_DECISION

Severity tags:
- Critical
- High
- Medium
- Low

---

## 4. Migration Planning Workflow

## Step 1 — Inventory
- enumerate physical PK/FK/UQ/CK from Batch 0–5 baseline.
- map each to canonical target rule class.

## Step 2 — Ownership/Boundary Screening
- reject any constraint proposal violating:
  - single write owner
  - proposal-only recommendation boundary
  - assessment mastery ownership
  - teaching orchestration-only boundary

## Step 3 — Compatibility Classification
- determine if physical rule matches canonical semantics:
  - exact semantic parity
  - naming-only drift
  - semantic drift
  - missing canonical invariant

## Step 4 — Risk Assessment
- classify operational impact and rollback complexity.
- identify data-shape prerequisites for tightened constraints.

## Step 5 — Gate Packaging
- produce migration-ready recommendation set (documentation stage only).

---

## 5. Constraint Type Strategy

## 5.1 PK Strategy
- Preserve one PK per table.
- Normalize PK naming to canonical `pk_<table>`.
- Avoid PK structure changes unless explicitly required by canonical model.

## 5.2 FK Strategy
- Physical FK set must align with WP-01 cross-domain classification.
- Ensure FK action semantics remain boundary-safe.
- For soft/event-only relationships: prevent accidental hard FK introduction.

## 5.3 Unique Strategy
- Preserve canonical identity and lifecycle uniqueness invariants.
- Remove/flag ambiguous uniqueness definitions that conflict with append-only patterns.
- Normalize naming to canonical `uq_<table>__...` pattern.

## 5.4 Check Strategy
- Standardize semantic checks:
  - actor type validity
  - decision type validity
  - lifecycle state validity
- Avoid checks that conflict with approved event-driven lifecycle progression.

---

## 6. Canonical Naming Normalization Plan

Constraint naming normalization priorities:
1. PK names
2. FK names
3. UQ names
4. CK names

Normalization rules:
- deterministic pattern required
- no auto-generated anonymous names in canonical execution target
- maintain stable name mappings for traceability

---

## 7. Constraint Conflict Handling Rules

Conflict classes:
- CF-01: same invariant, different naming (rename only)
- CF-02: same name, different semantics (high risk)
- CF-03: missing constraint for canonical invariant
- CF-04: physical constraint violates canonical boundary
- CF-05: check constraint overconstrains valid lifecycle transitions

Resolution policy:
- CF-02/CF-04 require governance review before migration planning sign-off.
- CF-03 must be explicitly planned in consolidation roadmap.
- CF-05 requires state machine and domain validation alignment.

---

## 8. Constraint Dependency and Ordering Considerations

Migration planning dependency order (policy-level):
1. PK alignment first (if needed)
2. data cleanup/preconditions (if required)
3. FK/UQ alignment
4. CK normalization
5. naming normalization finalization (or in controlled combined steps)

Constraint ordering must avoid transient referential breakage.

---

## 9. Decision and Explainability Constraint Preservation

Mandatory preservation:
- decision header/detail linkage integrity
- trace linkage structural validity constraints
- no migration strategy may introduce lineage truncation risk

Decision event canonicalization (`DecisionRegistered`) must remain consistent with constraint planning assumptions.

---

## 10. Constraint Migration Risk Controls

Controls required in future execution stage:
1. pre-migration invariant checks
2. post-migration parity checks
3. rollback naming and semantic mapping
4. dry-run validation in non-production environment
5. explicit exception handling for deferred constraints

---

## 11. Readiness Criteria for Constraint Strategy

Constraint migration strategy considered ready when:
1. every physical constraint is mapped to canonical action class,
2. no unresolved Critical/High boundary conflicts remain,
3. naming normalization map is complete,
4. dependency sequencing is documented,
5. decision/explainability constraints are explicitly preserved.

---

## 12. Alignment References

- `CanonicalConstraintCatalog.md`
- `CanonicalSchema_v1.md`
- `CanonicalTableCatalog.md`
- `Cross_Domain_FK_Strategy.md`
- `Domain_Boundary_Matrix.md`
- `Table_Ownership_Matrix.md`
- `SQLConsolidationReadinessReview.md`
