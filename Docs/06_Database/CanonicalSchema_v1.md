# Canonical Schema v1

## 1. Purpose

CanonicalSchema_v1 defines the single canonical logical database model that supersedes Batch 0–5 draft layering for design governance purposes.  
It preserves all locked architectural decisions and all approved WP-01 ownership/boundary rules.

This document is documentation-only and does not create SQL, migrations, or implementation artifacts.

---

## 2. Canonical Scope

Canonical model domains:
- Goal
- Roadmap
- Knowledge
- Evidence
- Assessment
- Discovery
- Recommendation
- Learning Session
- Mentor Interaction / Teaching
- AI Runtime (capability context)
- Shared Infrastructure (Decision Persistence, Explainability)

---

## 3. Canonical Design Principles

1. Single write owner per table.
2. Domain boundary integrity over convenience coupling.
3. Cross-domain influence via events/projections where possible.
4. Constraint standards are deterministic and naming-normalized.
5. Auditability, explainability, and decision traceability are first-class.
6. Soft delete and versioning behavior must be explicit, not implied.
7. Canonical naming must be stable and machine-auditable.

---

## 4. Canonical Domain Model Overview

## 4.1 Goal / Roadmap
Canonical entities:
- learner
- learner_goal (canonical planned entity)
- goal_progress (canonical planned entity)
- roadmap
- roadmap_node
- roadmap_node_knowledge_node

Ownership:
- Goal & Roadmap owns roadmap and mapping write paths.
- Learning Session/Teaching consume read projections only.

## 4.2 Knowledge
Canonical entities:
- knowledge_node
- expansion_record

Ownership:
- Knowledge Graph owns canonical knowledge writes.
- Assessment consumes knowledge for mastery evaluation.

## 4.3 Evidence
Canonical entities:
- evidence
- evidence_link

Ownership:
- Evidence owns evidence persistence only.
- Evidence does not mutate mastery or assessment tables.

## 4.4 Assessment
Canonical entities:
- assessment_result
- knowledge_node_mastery

Ownership:
- Assessment is sole owner of mastery decisions.

## 4.5 Discovery
Canonical entities:
- discovery_session
- self_assessment_mismatch

Ownership:
- Discovery owns mismatch and discovery session state.

## 4.6 Recommendation
Canonical entities:
- recommendation_proposal
- recommendation_proposal_response

Ownership:
- Recommendation is proposal-only.

## 4.7 Learning Session
Canonical entities:
- learning_session
- learning_session_transition
- sub_session

Ownership:
- Learning Session is coordinator-only for session state.
- No ownership over mastery, recommendation decision artifacts, or evidence write paths.

## 4.8 Mentor Interaction / Teaching
Canonical entities:
- mentor_session

Ownership:
- mentor_session canonical owner: Mentor Interaction.
- Teaching remains orchestration-only and owns no canonical aggregate table.

## 4.9 AI Runtime
Canonical entities:
- No canonical persisted domain aggregate table in current frozen baseline.
- AI runtime persistence is represented through telemetry/decision trace integrations.

## 4.10 Shared Infrastructure
Canonical entities:
- decision_header
- teaching_decision_detail
- local_expansion_decision_detail
- roadmap_mapping_decision_detail
- stuck_detection_decision_detail
- intervention_decision_detail
- trace_link

Ownership:
- Decision Persistence owns decision tables.
- Explainability owns trace_link.
- Core domains consume these through internal contracts.

---

## 5. Canonical Ownership and Boundary Guarantees

Guaranteed constraints in CanonicalSchema_v1:
1. Exactly one write owner per canonical table.
2. Assessment sole ownership of mastery state.
3. Evidence cannot directly update assessment/mastery state.
4. Recommendation cannot directly mutate session/mastery tables.
5. Teaching cannot directly mutate core aggregate tables.
6. Learning Session cannot mutate recommendation/assessment ownership tables.

See authoritative matrices:
- `Table_Ownership_Matrix.md`
- `Domain_Boundary_Matrix.md`

---

## 6. Canonical Naming Baseline

Naming baseline:
- snake_case for schemas, tables, columns, constraints, indexes.
- singular entity table naming for canonical business entities.
- explicit suffix conventions:
  - `_id` for identifiers
  - `_at` for timestamps
  - `_by_actor_type` for actor classifications
  - `_detail` for decision detail entities
  - `_transition` for transition ledgers
  - `_link`/`_mapping` for bridge tables

Detailed standards:
- `CanonicalColumnStandards.md`
- `CanonicalConstraintCatalog.md`
- `CanonicalIndexStrategy.md`

---

## 7. Canonical Integrity Standards

1. PK for every table (`*_id`).
2. FK strategy by classification:
   - Physical FK
   - Soft FK
   - Projection-only
   - Event-only
3. Unique constraints for identity and lifecycle invariants.
4. Check constraints for enum-like and non-empty semantic fields.
5. Mandatory index support for FK lookup and hot-path query patterns.

---

## 8. Canonical Audit / Soft Delete / Versioning / Explainability Standards

- Audit standards: actor fields + timestamps + rationale where applicable.
- Soft delete strategy: lifecycle status/archive preferred over hard delete in business tables.
- Versioning standards: explicit for mutable state snapshots and critical lifecycle entities.
- Explainability standards: canonical trace linkage via `trace_link` and decision persistence pathways.

See:
- `CanonicalAuditAndSoftDeleteStandards.md`
- `CanonicalVersioningStandards.md`

---

## 9. Canonical Decision and Event Alignment

Event and persistence alignment:
- `DecisionRegistered` is the canonical cross-domain decision event.
- `TeachingDecisionRegistered` is internal/derived.
- Decision persistence remains supporting/internal.

See:
- `Event_Ownership_Matrix.md`

---

## 10. Canonical Supersedence Statement (Batch 0–5)

CanonicalSchema_v1 supersedes Batch 0–5 as the normalized design target by:
1. Unifying ownership and boundary interpretation.
2. Normalizing naming and integrity conventions.
3. Consolidating cross-domain relationship policies.
4. Reconciling conceptual and physical inventory status via canonical mapping.
5. Preserving all locked architecture decisions.

This supersedence is governance-level and does not execute schema changes.

---

## 11. Non-Goals

- No migration scripts.
- No SQL DDL generation.
- No repository scaffolding.
- No API/backend implementation changes.
- No NestJS code changes.
