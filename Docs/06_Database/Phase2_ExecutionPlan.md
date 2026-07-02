# Phase 2 Execution Plan

## Scope

This plan defines eight Phase 2 work packages:

- WP-01 SQL Consolidation
- WP-02 Canonical Database Schema Generation
- WP-03 Repository Layer
- WP-04 Domain Event Bus
- WP-05 Backend Domain Implementation
- WP-06 AI Capability Runtime Integration
- WP-07 Automated Testing
- WP-08 CI/CD Preparation

The plan is documentation-only and does not perform schema/code/deployment changes.

---

## Execution Principles

1. Database-first stabilization before broad backend integration.
2. Event contract clarity before downstream intelligence chain scaling.
3. Stub-first AI runtime integration, then hardening.
4. Test automation and CI gates as release qualification enablers.
5. Production confidence gated by security and migration completion criteria.

---

## WP-01 — SQL Consolidation

### Objective
Consolidate SQL batches and associated review outcomes into a stable operational baseline with explicit closure of known SQL governance gaps required for Phase 2 execution.

### Inputs
- SQL Batch 0–5 artifacts and reviews
- Final schema readiness/dependency assessments
- Known open SQL-adjacent gaps (Batch 6/7 dependencies, cross-cutting RLS strategy)

### Dependencies
- Phase 1 closure artifacts available
- Governance agreement on no redesign without explicit decision process

### Deliverables
- Consolidated SQL baseline index/map of accepted schema artifacts
- Gap-closure checklist for policy/release blockers
- SQL operational readiness summary for implementation teams

### Acceptance Criteria
- Single source of truth for current accepted SQL baseline is published
- All open SQL items are categorized (blocking/high-priority/non-blocking/deferred)
- No unresolved ambiguity on schema ownership/dependency order

### Complexity
**Medium**

### Risk
**Medium-High**

---

## WP-02 — Canonical Database Schema Generation

### Objective
Generate and publish a canonical schema representation (authoritative model package) for repository/event/domain integration and test automation alignment.

### Inputs
- Consolidated SQL baseline (WP-01 output)
- Module ownership matrix and dependency graph
- Naming and consistency standards from database architecture docs

### Dependencies
- WP-01 complete
- Agreement on canonical representation format and governance owner

### Deliverables
- Canonical schema package (structure-level canonical references)
- Canonical table ownership mapping by module
- Canonical dependency chain reference for implementation sequencing

### Acceptance Criteria
- Canonical package is internally consistent with accepted SQL baseline
- Every table/entity maps to a clear module ownership boundary
- Dependency order is explicit for migration and runtime integration planning

### Complexity
**High**

### Risk
**Medium-High**

---

## WP-03 — Repository Layer

### Objective
Define and prepare repository contracts/implementations aligned to canonical schema and module boundaries, including transaction and consistency guardrails.

### Inputs
- Canonical schema package (WP-02)
- Module ownership/dependency matrix
- Persistence architecture constraints

### Dependencies
- WP-02 complete
- Transaction boundary rules documented and approved

### Deliverables
- Repository contract catalog by domain module
- Persistence interaction patterns (read/write ownership)
- Consistency and transaction handling guideline package

### Acceptance Criteria
- Repository boundaries align 1:1 with module ownership and no forbidden write paths
- Transaction behavior for core flows is explicitly documented
- Cross-module data access is routed through approved interfaces only

### Complexity
**High**

### Risk
**High**

---

## WP-04 — Domain Event Bus

### Objective
Establish domain event orchestration baseline with producer/consumer contract clarity for core event-flow chains.

### Inputs
- Event ownership mapping and module dependency matrix
- Event catalog and lifecycle review artifacts
- Repository layer boundaries (WP-03)

### Dependencies
- WP-03 partially complete for event source consistency
- Event contract governance agreement

### Deliverables
- Event contract package (producer/consumer/event envelope)
- Event-flow dependency matrix for execution chain
- Event reliability strategy (retry/dead-letter/idempotency principles)

### Acceptance Criteria
- Core event chains are mapped with no forbidden dependency inversions
- Critical event contracts are versioned and traceable
- Reliability and replay/idempotency strategy is documented for key flows

### Complexity
**High**

### Risk
**High**

---

## WP-05 — Backend Domain Implementation

### Objective
Execute prioritized backend domain implementation in dependency order for Goal, Roadmap, Knowledge, Evidence, Assessment, Discovery, Recommendation, and Learning Session.

### Inputs
- Repository layer baseline (WP-03)
- Event bus contract baseline (WP-04)
- Module implementation order and readiness assessments

### Dependencies
- WP-03 and WP-04 complete to minimum operational baseline
- SQL/canonical schema stability from WP-01/02

### Deliverables
- Domain implementation execution backlog by module order
- Integration checkpoints for each module boundary
- Domain completion criteria per module (functional + dependency compliance)

### Acceptance Criteria
- Module implementation sequence follows approved dependency chain
- No forbidden cross-module dependency introduced
- End-to-end core signal chain (Evidence→Assessment→Recommendation) is implementable and test-addressable

### Complexity
**High**

### Risk
**High**

---

## WP-06 — AI Capability Runtime Integration

### Objective
Integrate AI runtime capability path (stub-first then production-hardening path) across teaching/assessment/recommendation-related surfaces.

### Inputs
- Backend domain implementation outputs (WP-05)
- AI integration readiness constraints and provider boundary docs
- Runtime observability and decision trace requirements

### Dependencies
- WP-05 baseline complete
- Security/network/credential governance baseline available
- Decision and traceability integration points defined

### Deliverables
- AI runtime integration specification (stub and real-provider modes)
- Runtime boundary contract for module consumers
- AI invocation reliability and fallback policy package

### Acceptance Criteria
- Stub-mode runtime path supports core workflows
- Real-provider readiness criteria are explicit and measurable
- Runtime calls are traceable to decision/explainability paths

### Complexity
**High**

### Risk
**High**

---

## WP-07 — Automated Testing

### Objective
Define and execute automated test strategy covering schema consistency, repositories, event flows, module boundaries, and AI runtime integration paths.

### Inputs
- Outputs from WP-01 through WP-06
- Existing readiness criteria and known debt items

### Dependencies
- WP-03/04/05 foundational artifacts complete
- Test data and environment contracts available

### Deliverables
- Automated test matrix (unit/integration/event-flow/contract)
- Phase-gate verification suites
- Regression and risk-focused test coverage report

### Acceptance Criteria
- Critical path modules and event flows have automated coverage
- Blocking debt validation points are represented in test gates
- Regression baseline is stable and repeatable across environments

### Complexity
**Medium-High**

### Risk
**Medium-High**

---

## WP-08 — CI/CD Preparation

### Objective
Prepare CI/CD quality gates and release qualification flow for safe progression from implementation to deployable posture.

### Inputs
- Automated testing baseline (WP-07)
- Debt register priorities
- Security/migration gate requirements (Batch 6/7 related)

### Dependencies
- WP-07 complete to minimum gating baseline
- Organizational release governance criteria defined

### Deliverables
- CI quality gate policy package
- CD release readiness checklist and phase gate model
- Rollback/safety validation framework specification

### Acceptance Criteria
- Merge and release criteria enforce critical quality/security checks
- Phase gates include explicit go/no-go controls
- Release readiness can be assessed objectively from pipeline outputs

### Complexity
**Medium**

### Risk
**Medium-High**

---

## Phase 2 Gate Model (Summary)

### Gate G1 — Data Foundation Ready
- WP-01, WP-02 complete
- SQL baseline and canonical schema accepted

### Gate G2 — Integration Foundation Ready
- WP-03, WP-04 complete
- Repository and event contracts accepted

### Gate G3 — Domain Execution Ready
- WP-05 in stable progression
- Core dependency chain validated

### Gate G4 — Runtime & Quality Ready
- WP-06, WP-07 complete
- AI runtime and automated test baseline accepted

### Gate G5 — Release Preparation Ready
- WP-08 complete
- CI/CD gating aligned with risk/debt policy and go-live criteria
