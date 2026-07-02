# SQL Consolidation Execution Plan (WP-01)

## 1. Objectives

1. Consolidate all accepted SQL artifacts (Batch 0–5) into a canonical operational baseline.
2. Resolve ownership, boundary, and event-to-persistence alignment ambiguities before implementation.
3. Establish validation gates for Phase 2 handoff (WP-02 onward) without generating new SQL.
4. Produce traceable governance outputs for schema, table ownership, domain boundaries, events, and cross-domain FK strategy.

---

## 2. Scope

### In Scope
- Consolidation planning across existing SQL and architecture artifacts.
- Canonical schema inventory and ownership normalization.
- Domain boundary and event ownership matrix harmonization.
- Cross-domain FK classification strategy (physical/soft/projection/event-only).
- Review and validation gate definitions.

### Out of Scope
- SQL generation.
- Migration creation.
- Schema modification.
- Repository or backend code implementation.
- CI pipeline implementation changes.

---

## 3. Inputs

Primary source inputs:
- `Docs/06_Database/SQL_BATCH0_INFRASTRUCTURE.sql`
- `Docs/06_Database/SQL_BATCH1_IDENTITY_GOAL_ROADMAP.sql`
- `Docs/06_Database/SQL_BATCH2_KNOWLEDGE_EVIDENCE_ASSESSMENT.sql`
- `Docs/06_Database/SQL_BATCH3_LEARNING_DISCOVERY_MENTOR_RECOMMENDATION.sql`
- `Docs/06_Database/SQL_BATCH4_DECISION_PERSISTENCE.sql`
- `Docs/06_Database/SQL_BATCH5_COMPLETION.sql`
- `Docs/06_Database/SQL_BATCH5_REVIEW.md`
- `Docs/06_Database/MODULE_DEPENDENCY_MATRIX.md`
- `Docs/06_Database/APPLICATION_LAYER_MAPPING.md`
- `Docs/06_Database/EVENT_CATALOG.md`
- `Docs/06_Database/EVENT_DEPENDENCY_MATRIX.md`
- `Docs/06_Database/BACKEND_MODULE_CATALOG.md`
- `Docs/06_Database/BACKEND_MODULE_READINESS_ASSESSMENT.md`
- `Docs/06_Database/MODULE_IMPLEMENTATION_ORDER.md`

---

## 4. Assumptions

1. Phase 1 closure is accepted.
2. SQL Batch 0–5 is the current frozen schema baseline.
3. Batch 6 (RLS) and Batch 7 (migration confidence) remain release gates, not redesign phases.
4. Exactly one write owner is required per canonical table.
5. Cross-domain interactions should prefer events/projections over direct write coupling.
6. Decision and explainability internals remain internal-only surfaces.

---

## 5. Consolidation Phases

## Phase C1 — Baseline Freeze Confirmation
- Confirm accepted SQL baseline and review status.
- Confirm unresolved items list (e.g., RLS strategy, trace-link edge gaps where applicable).

**Output:** Baseline lock statement and unresolved-items register.

## Phase C2 — Canonical Schema Enumeration
- Enumerate all schema tables and classify by domain alignment.
- Tag canonical tables, duplicate candidates, merge candidates, redesign-needed candidates.

**Output:** Canonical schema inventory.

## Phase C3 — Ownership Normalization
- Assign owning domain, write owner, read consumers per table.
- Ensure one-and-only-one write owner per table.

**Output:** Table ownership matrix.

## Phase C4 — Boundary Consolidation
- Define read/write allowances for domain pairs.
- Mark forbidden writes and event-based integration paths.
- Verify hard constraints:
  - Assessment sole owner of mastery decisions.
  - Evidence does not mutate mastery.
  - Recommendation is proposal-only.
  - Teaching orchestration-only.
  - Learning Session coordinator-only.

**Output:** Domain boundary matrix.

## Phase C5 — Event Ownership Consolidation
- Define producer/consumers, payload owner, persistence owner per event.
- Define retry/idempotency baseline per event category.
- Identify duplicate/ambiguous/canonicalization-needed events.

**Output:** Event ownership matrix.

## Phase C6 — Cross-Domain FK Strategy Consolidation
- Classify inter-domain relationships into:
  - Physical FK
  - Soft FK
  - Projection-only
  - Event-only dependency
- Define exceptions and isolation constraints.

**Output:** Cross-domain FK strategy.

---

## 6. Review Checkpoints

1. **Checkpoint R1 — Baseline Integrity**
   - SQL baseline and review references verified.
2. **Checkpoint R2 — Ownership Integrity**
   - No table has multiple write owners.
3. **Checkpoint R3 — Boundary Integrity**
   - Domain rules comply with frozen architecture constraints.
4. **Checkpoint R4 — Event Integrity**
   - Event producer/consumer ownership is unambiguous and non-conflicting.
5. **Checkpoint R5 — FK Strategy Integrity**
   - Cross-domain relationships are classified consistently and enforce isolation rules.

---

## 7. Validation Gates

## Gate V1 — Structural Consistency
- Canonical schema and ownership matrices have no conflicts.
- Domain-to-table mapping is complete.

## Gate V2 — Ownership Non-Conflict
- Exactly one write owner per table.
- No ownership collision between domains.

## Gate V3 — Boundary Compliance
- Boundary matrix enforces read/write constraints and role rules.
- Required explicit verifications are all satisfied.

## Gate V4 — Event Flow Coherence
- Event matrix has no duplicate ownership conflicts.
- Retry and idempotency patterns are defined by event type.

## Gate V5 — Cross-Domain Integrity
- FK strategy classification is complete and consistent across documents.
- Physical vs soft vs projection vs event-only is rationale-backed.

---

## 8. Deliverables

1. `Docs/06_Database/SQL_Consolidation_Execution_Plan.md`
2. `Docs/06_Database/Canonical_Schema_Inventory.md`
3. `Docs/06_Database/Table_Ownership_Matrix.md`
4. `Docs/06_Database/Domain_Boundary_Matrix.md`
5. `Docs/06_Database/Event_Ownership_Matrix.md`
6. `Docs/06_Database/Cross_Domain_FK_Strategy.md`

---

## 9. Risks

1. **Ownership Drift Risk (High)**  
   Legacy assumptions may conflict with normalized write ownership requirements.

2. **Boundary Ambiguity Risk (High)**  
   Cross-domain read/write semantics may be interpreted inconsistently without strict matrix enforcement.

3. **Event Canonicalization Risk (Medium-High)**  
   Event naming/ownership ambiguity can create orchestration divergence.

4. **FK Coupling Risk (Medium-High)**  
   Overuse of physical FK across domain boundaries can weaken modular isolation and migration flexibility.

5. **Gate Slippage Risk (Medium)**  
   Incomplete validation can propagate unresolved ambiguities into implementation packages.

---

## 10. Go / No-Go Criteria

## Go
- All six consolidation documents are complete and internally consistent.
- Ownership matrix guarantees one write owner per table.
- Boundary matrix passes required explicit rule verification.
- Event matrix has no unresolved producer/consumer ownership conflicts.
- FK strategy classifies all inter-domain dependencies with clear rationale.

## No-Go
- Any table has multiple write owners or no write owner.
- Boundary constraints conflict with frozen architecture rules.
- Event ownership remains ambiguous for critical events.
- Cross-domain FK strategy is incomplete or contradictory.
- Consolidation outputs cannot support WP-02 canonical schema finalization.
