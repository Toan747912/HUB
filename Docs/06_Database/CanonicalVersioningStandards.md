# Canonical Versioning Standards

## 1. Purpose

Define canonical versioning policy for:
- mutable state entities
- append-only ledgers
- lifecycle transitions
- decision/explainability persistence traceability

This is a governance standard only (no SQL or implementation code).

---

## 2. Versioning Principles

1. Versioning exists to preserve consistency, conflict safety, and traceability.
2. Mutable snapshots require explicit concurrency/version policy.
3. Append-only records are versioned by sequence/time, not mutable overwrite.
4. Versioning must not violate ownership or boundary rules.
5. Decision and explainability artifacts prioritize immutable lineage.

---

## 3. Versioning Model by Table Class

## 3.1 Mutable snapshot entities
Examples:
- roadmap
- roadmap_node
- knowledge_node_mastery
- learning_session
- mentor_session
- discovery_session

Canonical policy:
- include `version_number` where concurrent mutation risk exists.
- increment policy is monotonic.
- updates must preserve audit fields.

## 3.2 Append-only entities
Examples:
- assessment_result
- evidence
- recommendation_proposal_response
- learning_session_transition
- decision_header
- decision_detail tables
- trace_link

Canonical policy:
- immutable rows.
- sequence implied by time/order/correlation key.
- no mutable version column required unless explicitly justified.

## 3.3 Bridge/link entities
Examples:
- evidence_link
- roadmap_node_knowledge_node

Canonical policy:
- versioning optional; prefer immutable create/unlink semantics.
- if mutable, must define explicit versioning rationale.

---

## 4. Concurrency and Conflict Standards

1. Versioned mutable entities must support optimistic concurrency semantics.
2. Stale update attempts should be detectable through version mismatch.
3. Cross-domain updates must not rely on implicit lock-step coupling.
4. Eventual consistency flows should rely on event ordering/idempotency keys where direct version lock is not appropriate.

---

## 5. Lifecycle Versioning Standards

## 5.1 Session-oriented entities
- `learning_session` and `mentor_session` use lifecycle transition progression.
- transition ledgers should provide replayable sequence context.
- active state mutations must be traceable to transition operations.

## 5.2 Recommendation lifecycle
- proposal state transitions should be auditable.
- responses are append records and do not overwrite historical truth.

## 5.3 Mastery lifecycle
- mastery snapshot should be versioned for conflict-safe updates.
- new assessment results should produce deterministic mastery evolution path.

---

## 6. Decision and Explainability Lineage Versioning

1. `decision_header` and detail tables are immutable lineage records.
2. `trace_link` is append-oriented and should preserve historical trace context.
3. Canonical decision event (`DecisionRegistered`) acts as cross-domain lineage marker.
4. Internal derived events must not become alternate canonical lineage roots.

---

## 7. Version Field Naming Standards

Preferred naming:
- `version_number` for mutable table version counters.
- `transition_sequence` for transition ledgers.
- `event_sequence` where ordered event streams require explicit sequence.
- `revision_label` only for governance/documentation metadata (not runtime mutation key).

---

## 8. Versioning and Soft Delete Interaction

1. Soft-delete/lifecycle status transitions are versioned updates on mutable snapshots.
2. Archive/close transitions must preserve prior versions through audit.
3. Append-only records should not be “soft-deleted” as lifecycle replacement.

---

## 9. Versioning Anti-Patterns

1. Mutable tables without deterministic conflict detection policy.
2. Overwriting append-only records.
3. Mixing lifecycle transitions and hard delete for historical entities.
4. Multiple independent canonical version counters for one ownership scope.
5. Using derived internal events as canonical version lineage source.

---

## 10. Compliance Checklist

A table/process is versioning-compliant if:
1. Lifecycle class is explicitly identified.
2. Versioning mode is declared (mutable-counter vs append-sequence).
3. Conflict detection strategy is documented for mutable state.
4. Decision/explainability lineage remains immutable.
5. Ownership and boundary constraints are preserved.

---

## 11. Alignment References

- `CanonicalSchema_v1.md`
- `CanonicalTableCatalog.md`
- `CanonicalColumnStandards.md`
- `CanonicalAuditAndSoftDeleteStandards.md`
- `Event_Ownership_Matrix.md`
- `SQL_Consolidation_GapAnalysis.md`
