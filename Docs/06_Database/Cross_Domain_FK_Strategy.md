# Cross-Domain FK Strategy

## 1. Purpose

Define cross-domain relationship strategy with explicit classification for each dependency:

- Physical FK
- Soft FK
- Projection-only
- Event-only dependency

This strategy balances:
- integrity
- isolation
- scalability
- migration safety
- ownership boundaries

No schema changes are made in this document.

---

## 2. Strategy Principles

1. **Single Write Ownership First**
   - FK strategy must not violate table write-owner boundaries.

2. **Physical FK for core referential invariants**
   - Use when strict transactional integrity is mandatory and boundaries are stable.

3. **Soft FK for decoupled cross-domain references**
   - Use when tight coupling would harm boundary isolation or migration flexibility.

4. **Projection-only for read optimization**
   - No ownership transfer, no cross-domain write path introduction.

5. **Event-only for orchestration effects**
   - Preferred when downstream actions should not require direct relational coupling.

6. **Supporting-module exception control**
   - Explainability and Decision Persistence may reference multiple domains through controlled internal contracts.

---

## 3. Classification Rules

## 3.1 Physical FK (Default when all conditions hold)
Use Physical FK when:
- source and target represent strict invariant relationship;
- boundary coupling is acceptable under frozen architecture;
- delete/update semantics are well-governed;
- migration order is stable and tested.

## 3.2 Soft FK
Use Soft FK when:
- domains are independently evolving;
- strict FK would over-couple lifecycle ownership;
- eventual consistency is acceptable;
- integrity is maintained by application/event validation.

## 3.3 Projection-only
Use when:
- relation is needed for query/read composition only;
- no direct write ownership should be implied;
- data may be denormalized asynchronously.

## 3.4 Event-only Dependency
Use when:
- downstream action is triggered behavior, not relational ownership;
- eventual consistency is acceptable;
- retry/idempotency guarantees can enforce correctness.

---

## 4. Domain Isolation Rules

1. Core domains must not gain write capability through FK presence.
2. Recommendation remains proposal-only; no FK path should imply mastery/session mutation rights.
3. Evidence must not gain mastery write coupling through FK.
4. Teaching remains orchestration-only; no physical FK ownership expansion into core aggregates.
5. Learning Session remains coordinator-only; session coordination references should avoid ownership inversion.
6. Supporting modules can hold cross-domain references but only for internal decision/trace use.

---

## 5. Shared Infrastructure Exceptions

Allowed exceptions under strict governance:
- Decision Persistence: cross-domain references via decision headers/details for audit traceability.
- Explainability: cross-domain links through `trace_link` style references.
- Projection/read models: may compose cross-domain keys without write ownership changes.

Exception constraints:
- must be read-governed or internal-service-governed;
- must not open direct forbidden writes;
- must document consistency model and failure handling.

---

## 6. Cross-Domain Relationship Classification Matrix

| Relationship | Source Domain | Target Domain | Classification | Rationale | Consistency Model |
|---|---|---|---|---|---|
| Roadmap node ↔ Knowledge node mapping (`roadmap_node_knowledge_node`) | Goal & Roadmap | Knowledge | Physical FK + boundary write-owner rule | Strong mapping integrity needed; write-owner remains Goal & Roadmap | Transactional consistency |
| Evidence → Knowledge context reference | Evidence | Knowledge | Soft FK | Evidence captures context without owning knowledge lifecycle | Eventual consistency + validation checks |
| Evidence → Assessment trigger | Evidence | Assessment | Event-only dependency | Assessment should react to evidence, not be relationally write-coupled | Eventual consistency with retries |
| Assessment result → Knowledge node | Assessment | Knowledge | Physical FK | Assessment result must reference valid knowledge target | Transactional consistency |
| Mastery (`knowledge_node_mastery`) → Assessment result linkage | Assessment | Assessment | Physical FK (intra-domain) | Internal consistency of mastery lineage | Transactional consistency |
| Discovery mismatch → Assessment context | Discovery | Assessment | Soft FK / event-informed | Discovery consumes assessment outcomes without ownership transfer | Eventual consistency |
| Recommendation proposal → Assessment/Discovery signals | Recommendation | Assessment/Discovery | Event-only + projection-only | Recommendation generated from signals, not direct write coupling | Eventual consistency |
| Recommendation → Learning Session actionability | Recommendation | Learning Session | Event-only dependency | Recommendation should not directly mutate session state | Eventual consistency with idempotent consumer |
| Learning Session → Teaching context | Learning Session | Teaching | Projection-only | Teaching orchestration consumes session context | Near-real-time projection consistency |
| Teaching → AI Runtime invocation | Teaching | AI Runtime | Event-only / invocation contract | Capability invocation boundary, not relational ownership | Runtime eventual completion model |
| Mentor Session → Evidence capture path | Mentor Interaction | Evidence | Event-only dependency | Response capture routed as evidence event | Eventual consistency |
| Decision header/detail references to domain entities | Decision Persistence | Multi-domain | Soft FK (controlled internal) | Audit/decision trace across domains without ownership transfer | Internal consistency via service contracts |
| Trace links across entities | Explainability | Multi-domain | Soft FK / polymorphic reference | Explainability graph spans domains and should avoid hard coupling explosion | Internal eventual consistency + validation |

---

## 7. Physical FK Rules

1. Physical FK is mandatory for:
   - intra-aggregate integrity;
   - strict bridge tables where owner is explicit and stable;
   - high-risk integrity paths where orphan states are unacceptable.
2. Physical FK must include:
   - clear delete/update action semantics;
   - indexed FK columns;
   - migration order validation.
3. Physical FK should be avoided when it creates forbidden cross-domain write coupling.

---

## 8. Soft Reference Rules

1. Soft FK must include:
   - identifier format contract;
   - existence validation strategy;
   - failure handling and reconciliation process.
2. Soft references are preferred for:
   - polymorphic trace/decision targets;
   - cross-domain links with asynchronous update models.
3. Soft FK usage must be documented in ownership and event matrices to prevent ambiguity.

---

## 9. Eventual Consistency Rules

1. Event consumers must implement idempotency keys.
2. Retry policy and dead-letter handling required for critical chains.
3. Read projections may lag source of truth; SLA/lag tolerance must be documented.
4. Reconciliation jobs required where missed/late events can impact decision quality.

---

## 10. Projection-Only Rules

1. Projection tables/models are read-only from consuming domains.
2. Projection refresh strategy must define:
   - source events/queries
   - staleness tolerance
   - rebuild/recovery method.
3. Projection ownership does not alter source table write ownership.

---

## 11. Governance Checklist for New Cross-Domain Relationship

Before introducing/changing any relationship:
1. Identify source and target write owners.
2. Choose classification (Physical/Soft/Projection/Event-only).
3. Document rationale and consistency model.
4. Confirm no forbidden write boundary is introduced.
5. Confirm event/retry/idempotency requirements (if event-based).
6. Validate against domain boundary matrix and table ownership matrix.
7. Approve through architecture governance if boundary exception is required.

---

## 12. Summary

The recommended cross-domain strategy is:
- **Physical FK** for strict integrity where ownership and coupling are stable.
- **Soft FK** for cross-domain traceability and flexible evolution.
- **Projection-only** for read composition.
- **Event-only** for orchestration and downstream behavior without ownership inversion.

This preserves modular boundaries while maintaining data correctness and operational resilience for Phase 2 execution.

---

## 13. Appendix — Cross-Domain FK Traceability

| Source Table | Source Column | Target Table | Target Column | Classification | Ownership Justification |
|---|---|---|---|---|---|
| `roadmap_node_knowledge_node` | `roadmap_node_id` | `roadmap_node` | `roadmap_node_id` | Physical FK | Mapping table is write-owned by Goal & Roadmap and must enforce roadmap structural integrity. |
| `roadmap_node_knowledge_node` | `knowledge_node_id` | `knowledge_node` | `knowledge_node_id` | Physical FK | Bridge requires strict referential integrity to valid knowledge nodes while preserving write ownership in Goal & Roadmap for mapping records. |
| `evidence` | `knowledge_node_id` (contextual reference) | `knowledge_node` | `knowledge_node_id` | Soft FK | Evidence references knowledge context but Evidence domain does not own Knowledge lifecycle. |
| `assessment_result` | `knowledge_node_id` | `knowledge_node` | `knowledge_node_id` | Physical FK | Assessment-owned results must reference an existing knowledge node for mastery computation integrity. |
| `knowledge_node_mastery` | `last_assessment_result_id` | `assessment_result` | `assessment_result_id` | Physical FK | Mastery lineage is Assessment-internal consistency and requires strict referential enforcement. |
| `self_assessment_mismatch` | `assessment_result_id` (derived/contextual) | `assessment_result` | `assessment_result_id` | Soft FK | Discovery consumes assessment context without acquiring assessment write ownership. |
| `recommendation_proposal` | `assessment_result_id` (signal link) | `assessment_result` | `assessment_result_id` | Soft FK | Recommendation is proposal-only and should reference assessment signal context without mutating assessment state. |
| `recommendation_proposal` | `discovery_session_id` (signal link) | `discovery_session` | `discovery_session_id` | Soft FK | Recommendation consumes discovery signals as inputs and remains write-owner only of proposal artifacts. |
| `recommendation_proposal` | `learning_session_id` (consumption context) | `learning_session` | `learning_session_id` | Event-only | Recommendation-to-session actionability should be event-driven to avoid ownership inversion into session state. |
| `learning_session` | `active_recommendation_projection_id` | projection/read model | projection key | Projection-only | Session coordinator may read recommendation projections without owning recommendation tables. |
| `mentor_session` | `sub_session_id` | `sub_session` | `sub_session_id` | Physical FK | Mentor Interaction runtime session anchors to Learning Session partitioning while preserving single table write ownership. |
| `evidence` | `mentor_session_id` (capture context) | `mentor_session` | `mentor_session_id` | Event-only | Evidence capture from mentor interactions should be integrated through event flow, not direct ownership-coupling writes. |
| `decision_header` | `source_entity_id` (polymorphic) | multiple domain tables | domain PK | Soft FK | Decision Persistence spans domains for audit, using controlled internal references without cross-domain ownership transfer. |
| `trace_link` | `source_id` / `target_id` (polymorphic) | multiple domain tables | domain PK | Soft FK | Explainability trace graph requires polymorphic references across domains and must avoid rigid cross-domain FK explosion. |
