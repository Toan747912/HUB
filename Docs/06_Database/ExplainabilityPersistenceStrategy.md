# Explainability Persistence Strategy (WP-03 Planning)

## 1. Purpose

Define physical consolidation planning strategy to preserve explainability persistence semantics across Batch 0–5 to canonical baseline transition.

Primary concerns:
- reasoning continuity
- confidence/decision trace continuity
- trace linkage integrity
- no-loss lineage guarantees

No SQL or implementation changes are produced.

---

## 2. Canonical Explainability Preservation Goals

1. Preserve `trace_link` as canonical explainability graph artifact.
2. Preserve decision-header linkage as canonical reasoning envelope.
3. Preserve canonical event alignment:
   - `DecisionRegistered` is canonical cross-domain decision event.
   - internal derived events must not become canonical lineage roots.
4. Preserve source-target traceability without ownership inversion.
5. Ensure consolidation planning introduces no explainability data-loss path.

---

## 3. Explainability Data Elements to Preserve

Mandatory explainability semantics (conceptual preservation set):
- rationale/reasoning context
- confidence/weighting context
- source artifact identity (`source_type`, `source_id`)
- target artifact identity (`target_type`, `target_id`)
- decision linkage (`decision_header_id` where applicable)
- actor/time provenance (`created_at`, actor metadata)
- traceability correlation context (`traced_to` equivalent semantic path)

---

## 4. Explainability Migration Classification

For each explainability-related physical element:
- KEEP_AS_IS
- NORMALIZE_NAME
- NORMALIZE_SEMANTICS
- MERGE_SEMANTICALLY_EQUIVALENT (planning)
- ADD_MISSING_LINKAGE (planning)
- REQUIRES_DECISION

Severity:
- Critical (lineage loss path)
- High (lineage ambiguity or ownership violation)
- Medium (naming/semantic drift)
- Low (documentation clarity enhancements)

---

## 5. Explainability Persistence Boundaries

Boundary rules:
1. Explainability tables do not grant cross-domain write ownership.
2. Trace links may reference multiple domains via controlled polymorphic model.
3. Decision/trace persistence remains supporting module behavior.
4. Core domain ownership remains unchanged by explainability mappings.
5. Recommendation/Teaching/Learning Session boundaries must not be bypassed by trace coupling.

---

## 6. Lineage Continuity Controls

Required continuity controls:
1. Every decision-bearing change can map to canonical decision envelope.
2. Every explainability trace edge remains reconstructable after naming normalization planning.
3. source-target type taxonomy remains controlled and version-safe.
4. No consolidation recommendation may drop reasoning-bearing fields.
5. Trace edge cardinality/identity assumptions must remain stable.

---

## 7. Explainability Conflict Detection Rules

Flag as conflict:
- EX-01: reasoning semantics present in legacy but absent in canonical target mapping.
- EX-02: confidence semantics ambiguously mapped or downgraded.
- EX-03: `traced_to` style path loses determinism through renaming/consolidation.
- EX-04: trace target/source type expansion without controlled taxonomy rule.
- EX-05: decision linkage removed or made optional where previously required for lineage.
- EX-06: explainability mapping introduces ownership boundary violation.

---

## 8. Decision-Trace Integration Strategy

Planning policy:
1. Preserve `decision_header` as canonical decision envelope for explainability linkage.
2. Keep detail tables specialized while preserving one envelope source of truth.
3. Preserve `trace_link` as append-oriented graph with immutable lineage intent.
4. Ensure event model remains canonical (`DecisionRegistered`) for cross-domain trace continuity.

---

## 9. Explainability Migration Audit Checklist (Phase E)

A pass requires:
1. no explainability data element in preservation set is lost.
2. no decision-trace linkage ambiguity remains unresolved.
3. source-target taxonomy rules remain coherent.
4. no ownership/boundary violation introduced.
5. no Critical/High explainability issue remains open.

---

## 10. Explainability Readiness Criteria

Ready when:
- lineage continuity has no unresolved Critical/High risk,
- reasoning/confidence/trace semantics are preserved in mapping strategy,
- decision and event canonicalization remains stable,
- taxonomy change controls are documented for future evolution.

---

## 11. Risk and Exception Handling

If unresolved explainability ambiguity exists:
1. register in `DataMigrationRiskRegister.md`,
2. classify severity and blast radius,
3. define mitigation and fallback,
4. gate readiness decision accordingly in `SQLConsolidationReadinessReview.md`.

---

## 12. Alignment References

- `Event_Ownership_Matrix.md` (WP-01 frozen)
- `Cross_Domain_FK_Strategy.md` (WP-01 frozen)
- `CanonicalSchema_v1.md` (WP-02 frozen)
- `CanonicalAuditAndSoftDeleteStandards.md`
- `CanonicalVersioningStandards.md`
- `SQL_Consolidation_GapAnalysis.md`
