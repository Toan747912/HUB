# Canonical Index Strategy

## 1. Purpose

Define canonical indexing standards for the consolidated schema target.

Objectives:
- guarantee integrity-path performance
- guarantee FK lookup performance
- support lifecycle/state query paths
- support event/decision/trace observability paths
- avoid speculative over-indexing

No DDL is generated in this document.

---

## 2. Index Naming Convention

| Index Type | Pattern | Example |
|---|---|---|
| Standard btree | `ix_<table>__<column_list>` | `ix_assessment_result__knowledge_node_id` |
| Unique index | `uqx_<table>__<column_list_or_scope>` | `uqx_learning_session__active_per_learner` |
| Partial index | `pix_<table>__<scope>__<column_list>` | `pix_recommendation_proposal__active__learner_id` |
| Composite index | `ix_<table>__<col1>__<col2>` | `ix_knowledge_node_mastery__learner_id__knowledge_node_id` |

Rules:
1. Deterministic names only.
2. Names must encode query intent where possible.
3. Prefix uniqueness within schema required.

---

## 3. Baseline Index Classes

## 3.1 Mandatory index classes
1. PK-backed index (implicit or explicit by platform).
2. FK-leading index for each Physical FK column.
3. Unique constraint backing indexes.
4. Lifecycle hot-path indexes for active-state queries.
5. Event correlation and idempotency lookup indexes.
6. Decision/trace traversal indexes.

## 3.2 Conditional index classes
1. Partial indexes for active-only sets.
2. Composite indexes for known multi-column filters.
3. Covering strategy variants for read-heavy projections (policy-only here).

---

## 4. FK Index Policy

1. Every Physical FK requires supporting index coverage.
2. Composite indexes must place query-leading FK columns first for expected access patterns.
3. Where FK is not leading in existing composite, dedicated single-column index may be required.
4. Soft FK/Event-only references may receive optional lookup indexes based on query volume.

---

## 5. Domain-Specific Canonical Index Priorities

## 5.1 Goal / Roadmap
Priority paths:
- roadmap lookup by learner/context
- roadmap node traversal by parent/roadmap
- node-to-knowledge mapping lookup by both foreign references

## 5.2 Knowledge / Evidence / Assessment
Priority paths:
- evidence by learner/session/time
- assessment by learner + knowledge_node
- mastery point lookup by learner + knowledge_node
- reverse lookup by knowledge_node and assessment lineage

## 5.3 Discovery / Recommendation
Priority paths:
- mismatch queries by learner/session/time
- recommendation active proposals by learner/status
- response lookup by proposal id and chronological flow

## 5.4 Learning Session / Mentor Interaction
Priority paths:
- active session lookup by learner
- transition sequence retrieval by session id + order
- mentor session by sub_session/session context

## 5.5 Decision Persistence / Explainability
Priority paths:
- decision_header by source entity and created_at
- decision detail lookup by decision_header_id
- trace traversal by source, target, type, and time

---

## 6. Composite Index Design Standards

1. Order composite columns by query selectivity and filter prefix patterns.
2. Separate indexes for reverse traversal if bidirectional lookup is frequent.
3. Avoid redundant composites when equivalent index already covers lead prefix.
4. Keep index strategy aligned with bounded hot paths; avoid speculative bulk indexing.

---

## 7. Partial Index Strategy Standards

Use partial index when:
- query scope frequently targets subset by status/state/time-window
- index selectivity materially improves over full-table index
- lifecycle status has stable semantics

Examples (policy-level):
- active recommendations
- non-archived sessions
- unresolved mismatch records

---

## 8. Event and Idempotency Index Standards

For event-driven consistency:
1. Index event correlation IDs and idempotency keys.
2. Ensure decision/event lineage tables support deduplication checks.
3. Optimize consumer replay windows via timestamp + sequence indexes.

---

## 9. Explainability and Decision Trace Index Standards

1. `trace_link` requires source and target traversal indexes.
2. Decision header requires source-entity and type/time indexes.
3. Decision detail tables require decision_header foreign reference indexes.
4. Observability/reporting traversals should rely on deterministic index naming and domain-safe filtering.

---

## 10. Anti-Patterns

1. Missing index on high-frequency FK lookups.
2. Composite indexes with non-useful leading columns for primary access path.
3. Overlapping redundant indexes with no measurable query benefit.
4. Partial indexes with ambiguous lifecycle predicates.
5. Indexing that encourages forbidden cross-domain joins as default data access strategy.

---

## 11. Index Governance Checklist

Before canonical index approval:
1. Is the index tied to an explicit query/access path?
2. Is ownership/boundary model preserved?
3. Is there duplication with existing effective index prefixes?
4. Is naming canonical and deterministic?
5. For partial indexes, is predicate stable and lifecycle-consistent?
6. Is this index required for FK integrity path performance or event traceability?

---

## 12. Alignment References

- `CanonicalSchema_v1.md`
- `CanonicalConstraintCatalog.md`
- `CanonicalColumnStandards.md`
- `CanonicalTableCatalog.md`
- `Cross_Domain_FK_Strategy.md`
- `SQL_Consolidation_GapAnalysis.md` (for index-gap reconciliation)
