# Canonical Column Standards

## 1. Purpose

Define canonical column-level naming and semantics standards for WP-02 consolidation.

Scope includes:
- identifier standards
- temporal standards
- actor/audit standards
- status/lifecycle standards
- decision/explainability column standards
- cross-domain reference standards

No SQL generation is included.

---

## 2. Naming Standards

## 2.1 General
1. Use `snake_case` only.
2. No abbreviations unless globally approved (`id`, `fk`, etc.).
3. Column names must be semantically explicit.
4. Boolean columns should be `is_*` or `has_*`.
5. Timestamp columns end with `_at`.

## 2.2 Identifier pattern
- Primary key: `<entity>_id`
- Foreign key: `<target_entity>_id`
- Correlation id: `<context>_correlation_id`
- External id: `<source>_external_id`

Examples:
- `learner_id`
- `knowledge_node_id`
- `decision_header_id`
- `runtime_invocation_correlation_id`

---

## 3. Canonical Required Base Columns by Lifecycle Type

## 3.1 Mutable snapshot entities
Required:
- `<entity>_id`
- `created_at`
- `updated_at`
- `created_by_actor_type`
- `updated_by_actor_type`
- `version_number` (where optimistic concurrency required)
- lifecycle/status column (`status`, `state`, or equivalent)

## 3.2 Append-only entities
Required:
- `<entity>_id`
- `created_at`
- `created_by_actor_type`
- immutable payload fields
- optional correlation columns

## 3.3 Bridge/link entities
Required:
- bridge identifier OR deterministic composite key (as architecture-approved)
- source FK/reference column(s)
- target FK/reference column(s)
- created audit fields

---

## 4. Data Type and Nullability Standards (Logical)

1. IDs must be stable and non-null.
2. Actor columns must be non-null on auditable tables.
3. Decision/explainability references should be non-null where business-critical.
4. Optional business metadata must be explicitly nullable and justified.
5. Text rationale fields must have non-empty semantic validation policy.

---

## 5. Audit Column Standards

Required audit columns (for governed tables):
- `created_at`
- `created_by_actor_type`
- `updated_at` (for mutable tables)
- `updated_by_actor_type` (for mutable tables)

Actor value policy:
- controlled set (e.g., `learner`, `backend_core`, `ai_service`) as approved in architecture governance.

Audit rationale policy:
- For decision-bearing tables, include reasoning summary column(s) where applicable.

---

## 6. Soft Delete and Lifecycle Columns

Preferred approach:
- lifecycle status over hard delete

Canonical options:
- `status` (e.g., active/archived/completed)
- `archived_at` (optional, when archival timestamp is needed)
- `closed_at` (for session-like flows)
- `expires_at` (for recommendation/ephemeral policies)

Rules:
1. Soft delete strategy must be explicit at table standard level.
2. Hard delete requires explicit exception approval.
3. Lifecycle transitions should be auditable.

---

## 7. Versioning Columns

For mutable state entities requiring concurrency control:
- `version_number` (integer monotonic)
- optional revision correlation fields for integration layers

Rules:
1. Versioned entities must define increment trigger/policy at implementation stage.
2. Append-only entities should not use mutable version columns unless justified.
3. Versioning policy must align with `CanonicalVersioningStandards.md`.

---

## 8. Decision Persistence Column Standards

Decision-header linked tables should include:
- `decision_header_id` (for decision-governed records)
- reasoning fields (`*_reason`, `*_reasoning`, or canonical equivalent)
- decision type discriminators where applicable
- traceability references for explainability alignment

Rules:
1. Cross-domain decision references should not imply cross-domain write ownership.
2. Decision identifiers must be immutable once persisted.

---

## 9. Explainability Column Standards

For traceability artifacts:
- `source_type`
- `source_id`
- `target_type`
- `target_id`
- `created_at`
- optional trace classification metadata

Rules:
1. Polymorphic references are allowed under explainability governance.
2. Trace records are append-oriented and immutable in principle.
3. Target/source enum consistency must be centrally governed.

---

## 10. Cross-Domain Reference Column Standards

1. Physical FK references use `<target_entity>_id`.
2. Soft references use explicit semantic suffix where needed:
   - `<target_entity>_ref_id`
   - `<target_entity>_context_id`
3. Event/projection relationships should avoid introducing implicit write authority.

Consistency requirement:
- Any cross-domain reference column must be classifiable in `Cross_Domain_FK_Strategy.md`.

---

## 11. Prohibited Patterns

1. Ambiguous ID names (`id1`, `ref`, `node`).
2. Mixed naming styles (`camelCase` + `snake_case`).
3. Unscoped status columns with unclear lifecycle semantics.
4. Required audit fields omitted on governed mutable tables.
5. Non-canonical polymorphic fields outside approved trace/decision contexts.

---

## 12. Compliance Checklist

A table is column-standard compliant when:
- naming follows canonical patterns,
- lifecycle category is identified,
- required audit/version/lifecycle columns are declared by policy,
- cross-domain reference columns are classified and justified,
- decision/explainability standards are respected where applicable.
