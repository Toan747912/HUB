# System Integration Review Sprint — AI Mentor OS (Thorough Full-System Audit)

**Scope:** Global Architecture Integration Review before SQL Consolidation / Backend Implementation  
**Mode:** Analysis-only (no code, no migration, no backend/frontend/docker work)

---

## 1. Analysis

This audit was executed with a **global consistency mindset** across:

Discovery → Goal → Roadmap → Knowledge → Evidence → Assessment → Recommendation → Learning Session → Teaching

plus cross-cutting layers:

- ApprovalRecord
- DecisionLog / decision_header-detail persistence
- Explainability propagation (`confidence`, `reasoning`, `traced_to`)
- Versioning / supersede chains
- Event system semantics

### 1.1 If SQL Consolidation starts tomorrow, what breaks first?

**First break:** shared enum/state contract collision at DB + backend boundary, especially:

1) `learning_session.state` (`Abandoned` present in `LearningSessionSchema_Draft.sql`)  
vs core architecture documents emphasizing `Archived` as terminal replacement model.

2) Event semantic collisions (`EvidenceRecorded` vs `EvidenceAdded` vs `EvidenceCollected`) causing consumer mismatch and dead subscribers.

3) Mixed SQL dialect artifacts (SQL Server style in Goal/Roadmap/LearningSession/Evidence schema drafts vs PostgreSQL style in Discovery schema draft comments such as `uuid`, `timestamptz`, `gen_random_uuid()`), preventing direct consolidation pipeline consistency.

### 1.2 Global consistency findings summary

- **State consistency:** FAIL (P0)
- **Event consistency:** FAIL (HIGH/P0 depending consumer contract strictness)
- **Ownership consistency:** WARNING→FAIL in ambiguous zones (P0 for mastery/mentor ownership contracts)
- **Version consistency:** WARNING (missing uniform fields)
- **Explainability consistency:** FAIL (CRITICAL where persistent `traced_to` is absent or non-uniform)

---

## 2. Risks

## 2.1 Dependency Matrix (Domain / Depends On / Reason / Risk)

| Domain | Depends On | Reason | Risk |
|---|---|---|---|
| Discovery | Goal, Assessment, Evidence, Knowledge | Clarification + mismatch against observed competence | MEDIUM |
| Goal | Discovery, ApprovalRecord | Goal creation/refinement and governance | HIGH |
| Roadmap | Goal, Knowledge, Recommendation, ApprovalRecord | Goal-bound path with learner-approved mutation | HIGH |
| Knowledge | Roadmap demand, Assessment, Evidence | Expansion + structural relations + mastery context | MEDIUM |
| Evidence | Teaching, Discovery, Assessment, Learning Session | Multi-source capture and verification lifecycle | MEDIUM |
| Assessment | Evidence, Knowledge, Discovery | Sole evaluator and mastery/regression writer | HIGH |
| Recommendation | Assessment, Discovery, Evidence, Goal/Roadmap | Signal aggregation and proposal-only flow | HIGH |
| Learning Session | Goal, Roadmap, Assessment, Recommendation, Teaching refs | Runtime orchestration and lifecycle tracking | HIGH |
| Teaching | Goal/Roadmap, Knowledge, Assessment, Recommendation | Capability orchestration and evidence generation | HIGH |
| Cross-cutting: ApprovalRecord | Goal/Roadmap + Learner action | Governance enforcement | HIGH |
| Cross-cutting: DecisionLog/TraceLink | All AI decisions | Explainability + audit | HIGH |
| Cross-cutting: Versioning | Goal/Roadmap/Evidence/Assessment/Recommendation | Supersede continuity | HIGH |
| Cross-cutting: State Machine | All runtime domains | Transition safety | HIGH |

## 2.2 Ownership Matrix (Aggregate/Table / Write Owner / Read Consumers / Status)

| Aggregate/Table | Write Owner | Read Consumers | Status |
|---|---|---|---|
| goal / goal_version / goal_relationship | Goal Domain | Discovery, Learning Session, Recommendation, Assessment | PASS |
| roadmap / roadmap_node / roadmap_node_dependency | Roadmap Domain | Learning Session, Teaching, Recommendation | PASS |
| roadmap_node_knowledge_node | Goal & Roadmap Domain (mapping owner) | Knowledge, Teaching, Assessment | WARNING |
| knowledge_node / knowledge_edge / expansion_record | Knowledge Domain | Roadmap, Teaching, Assessment, Recommendation | PASS |
| knowledge_node_mastery | Assessment Domain (DECISION-026) | Teaching, Recommendation, Learning profile | **FAIL (ownership ambiguity in peripheral docs/events)** |
| evidence / evidence_source / evidence_verification / evidence_trace_link | Evidence Domain (capture/lifecycle), Assessment verifies | Assessment, Recommendation, Teaching, Learning Session | PASS |
| assessment_result / assessment_result_source_evidence | Assessment Domain | Recommendation, Learning Session, Teaching/UI | PASS |
| recommendation_proposal | Recommendation Domain | Goal/Roadmap, Learning Session, Teaching/UI | PASS |
| learning_session / sub_session / learning_session_transition | Learning Session Domain | Teaching, Recommendation, Goal context | WARNING |
| mentor_session | Mentor Interaction domain (not fully centralized doc ownership) | Learning Session refs, Evidence source | **FAIL (owner boundary ambiguity)** |

### Ownership conflict checks

- Multiple write owner on one aggregate: **Detected risk zone** (`knowledge_node_mastery`, `mentor_session` ecosystem narrative).
- Conflict ownership: **Yes (FAIL)** in documentation-level contract clarity.
- Circular ownership: No explicit hard cycle, but orchestration edges are close to implicit bidirectional behavior.

## 2.3 Event Matrix (Event / Publisher / Subscribers)

| Event | Publisher | Subscribers | Status |
|---|---|---|---|
| SelfAssessmentMismatchDetected | Discovery | Assessment, Recommendation | PASS |
| GoalDefined / GoalSuperseded / GoalArchived | Goal | Learning Session (+ others by design) | PASS |
| RoadmapApproved / RoadmapNodeApproved | Goal & Roadmap | Learning Session, Recommendation, Knowledge touchpoints | WARNING (semantic overlap) |
| EvidenceRecorded / EvidenceAdded / EvidenceCollected / EvidenceVerified | Evidence | Assessment, Recommendation | **FAIL (duplicated semantics)** |
| AssessmentResultCreated | Assessment | Recommendation, Learning Session | PASS |
| KnowledgeRegressionDetected | Assessment | Recommendation, Teaching | PASS |
| RecommendationProposed | Recommendation | Goal/Roadmap, Learning Session, Teaching | PASS |
| RecommendationAccepted / Rejected | Recommendation process + learner action | Goal/Roadmap, Learning Session | WARNING |
| LearningSessionStarted/Paused/Resumed/Completed/Archived | Learning Session | Recommendation, Goal context, Teaching | WARNING (state model conflict source) |
| SubSessionStarted/Ended | Learning Session | Teaching, assessment/recommendation consumers | WARNING |

### Event loop / cyclic chain / orphan findings

- Potential cyclic chain risk:  
  AssessmentResultCreated → RecommendationProposed → LearningSession state change → Teaching behavior → new Evidence → AssessmentResultCreated  
  (needs idempotency/debounce contract)
- Orphan risk: event aliases for Evidence and Roadmap approval semantics.
- Event ambiguity: **HIGH RISK** (mandatory rule).

## 2.4 State Machine Matrix

| Domain | Canonical States Observed | Terminal/Dead/Unreachable/Conflict |
|---|---|---|
| Discovery | INIT/DISCOVERY/DISCOVERY_COMPLETE/BLOCKED/EXPIRED/ABANDONED (+ archived_at axis) | No dead-state proof issue; cross-doc maturity variance |
| Goal | Draft/Active/Paused/Completed/Superseded/Archived | Mostly coherent but immutability semantics must be clarified |
| Roadmap | Draft/Proposed/Approved/Active/Completed/Superseded/Archived | Coherent |
| Learning Session | Draft/Active/Paused/Completed/Abandoned/Archived in schema draft vs archived-centric in core map/reviews | **P0 BLOCKER: conflicting state model** |
| Evidence | Draft/Collected/Verified/Superseded/Archived | Coherent |
| Assessment | Evented lifecycle via immutable result log | No explicit contradiction found |
| Recommendation | proposed/accepted/rejected/expired/superseded | Coherent |

State consistency rule result: **FAIL** (P0)

## 2.5 Explainability Matrix (Prompt/API/Domain/Database)

Status legend: FULL / PARTIAL / MISSING

| Domain | Prompt | API | Domain | Database | Status |
|---|---|---|---|---|---|
| Discovery | PARTIAL | MISSING | PARTIAL | PARTIAL (schema comments, not executable + no unified trace contract) | PARTIAL |
| Goal | PARTIAL | MISSING | PARTIAL | PARTIAL (`reasoning` appears in snapshots/versioning but no explicit persistent traced_to) | PARTIAL |
| Roadmap | PARTIAL | MISSING | PARTIAL | PARTIAL (`confidence`/`reasoning` appears in roadmap_approval only) | PARTIAL |
| Knowledge | PARTIAL | MISSING | PARTIAL | PARTIAL (`expansion_record.traced_to` exists conceptually only in commented DDL) | PARTIAL |
| Evidence | FULL | FULL | FULL | FULL-ish (evidence_trace_link physicalized; still draft) | FULL |
| Assessment | PARTIAL | MISSING | PARTIAL | PARTIAL (confidence/reasoning present; traced link via junction to evidence) | PARTIAL |
| Recommendation | PARTIAL | MISSING | PARTIAL | PARTIAL (confidence/reasoning in schema comments; no explicit traced_to column) | PARTIAL |
| Learning Session | MISSING | MISSING | PARTIAL | PARTIAL (`reasoning` in transition log, no explicit confidence/traced_to standard) | MISSING |
| Teaching | FULL (domain rules) | MISSING | FULL | PARTIAL (decision tables referenced in other docs; not consolidated in reviewed schema set) | PARTIAL |

**CRITICAL explainability result:** FAIL  
Rule: missing persistent explainability trio anywhere → CRITICAL failure.

## 2.6 Version Chain Audit

Requirement: each aggregate should answer Current Version / Previous / Superseded By / Archived When

| Aggregate | Current | Previous | Superseded By | Archived When | Result |
|---|---|---|---|---|---|
| Goal | Yes (`current_version_number`) | Partial (`goal_version`) | Yes (`superseded_by_goal_id`) | Partial (`state`, no explicit archived_at column) | WARNING |
| Roadmap | Yes (`current_version_number`) | Yes (`predecessor_roadmap_id`, roadmap_version) | Partial (implicit via predecessor chains) | Partial (`state`, no explicit archived_at) | WARNING |
| AssessmentResult | Immutable log only | N/A | N/A | N/A | WARNING (not true version chain model) |
| Evidence | Yes (state-driven current) | Partial (supersede linkage) | Yes (`superseded_by_evidence_id`) | Partial (`state`, updated_at) | WARNING |
| RecommendationProposal | Current status | No explicit predecessor | `superseded` status only | timestamps via audit | WARNING |
| LearningSession | Current via state | No explicit version chain | implied via Goal supersede flow | partial via state/ended_at | WARNING |

Version consistency rule result: **WARNING/HIGH GAP**

## 2.7 SQL Consolidation Simulation (requested merged set)

Simulated scope:
- `EvidenceSchema_Draft.sql`
- `AssessmentSchema_Draft.sql`
- `KnowledgeSchema_Draft.sql`
- `RoadmapSchema_Draft.sql`
- `GoalSchema_Draft.sql`
- `LearningSessionSchema_Draft.sql`
- `DiscoverySchema_Draft.sql`

### Detected failure classes

1. **Inconsistent SQL style artifacts**
   - SQL Server executable DDL in some files.
   - PostgreSQL-style commented pseudo-DDL in Discovery.
   - Comment-only non-executable schema files for Knowledge/Assessment/Recommendation.
   - Result: pipeline inconsistency before functional validation starts.

2. **Duplicate/overlapping entity placement risk**
   - `mentor_session` created in LearningSession schema draft while ownership is argued outside Learning Session domain docs.
   - Potential duplicate table ownership if Mentor Interaction schema emerges separately.

3. **FK reference target uncertainty**
   - Some schemas reference tables that are only conceptual/commented in other drafts.
   - Missing executable target tables in same consolidation batch leads dependency ordering/blockers.

4. **Enum/state inconsistency**
   - `learning_session.state` includes `Abandoned` conflicting with architecture docs preferring `Archived`.

5. **Explainability persistence non-uniform**
   - `traced_to` represented variably (array in docs, separate trace table in Evidence, text blob in others, absent in many).

6. **Orphan constraint risk**
   - `roadmap_node_knowledge_node` has no explicit anti-orphan business rule beyond FK existence (e.g., soft-delete aware integrity behavior unresolved).

SQL consolidation verdict: **BLOCKER**

---

## 3. Open Questions

1. Canonical LearningSession terminal set: keep `Abandoned`, replace with `Archived`, or map both with strict semantics?
2. Canonical Evidence event vocabulary: which single event family is authoritative?
3. Who is strict transactional owner of `mentor_session` table and lifecycle?
4. Should `knowledge_node_mastery` update event stay in Knowledge namespace or be Assessment-only event namespace?
5. Is `traced_to` modeled as universal table-based trace link, JSON array, or both? Which is canonical?
6. Must every aggregate support explicit `archived_at` column, or is state-only acceptable?
7. For Assessment/Evidence versioning, do we need explicit predecessor linkage or immutable append-only is the canonical pattern?
8. How to normalize SQL dialect and execution readiness across all domain schema drafts?
9. Should `roadmap_node_knowledge_node` include lifecycle ownership columns to prevent semantic orphan links?
10. Which doc becomes single source of truth when DomainModel_Draft vs CoreDomainMap vs newer domain-specific specs diverge?

---

## 4. Generated Documents

- `Docs/REVIEWS/SystemIntegrationReview.md` (this updated full-system audit report)

---

## 5. Readiness Score

### 5.1 SQL Consolidation Readiness (0-10)

| Criterion | Score |
|---|---:|
| Naming Consistency | 3 |
| FK Consistency | 5 |
| Audit Consistency | 6 |
| Soft Delete Consistency | 5 |
| Explainability Persistence | 3 |
| Approval Workflow Persistence | 7 |

**Average:** 4.8 / 10

### 5.2 Overall Readiness (0-100)

| Dimension | Score |
|---|---:|
| Domain Design Readiness | 72 |
| Integration Readiness | 41 |
| SQL Consolidation Readiness | 38 |
| Backend Implementation Readiness | 35 |

---

## 6. Final Classification

## NEEDS_REVISION

Reason:
- P0 blockers exist
- ownership ambiguity exists
- event ambiguity exists
- state inconsistency exists
- explainability gaps exist

READY_FOR_SQL_CONSOLIDATION is disallowed under these conditions.

---

# A. Integration Risk Heatmap

| Risk Area | Severity |
|---|---|
| State canonical mismatch (Learning Session) | P0 / CRITICAL |
| Event semantic duplication (Evidence, Roadmap approvals) | HIGH |
| Ownership ambiguity (`knowledge_node_mastery`, `mentor_session`) | P0/HIGH |
| Explainability persistence non-uniformity | CRITICAL |
| Version chain non-uniformity | HIGH |
| SQL draft executability inconsistency | HIGH |
| Cross-domain FK dependency ordering risk | HIGH |
| Governance flow bypass risk (auto-actions) | HIGH |
| Event loop without idempotency contract | MEDIUM/HIGH |
| Mapping orphan semantics (`roadmap_node_knowledge_node`) | MEDIUM |

---

# B. SQL Consolidation Failure Scenarios

1. Migration batch fails due to unresolved FK targets from non-executable/comment-only schema artifacts.
2. Enum check constraint mismatch for `learning_session.state` breaks API-to-DB mapping.
3. Dual definition risk for `mentor_session` causes table ownership/schema collision.
4. Consumer queries fail because event/materialized view logic expects canonical event names that differ by module.
5. Traceability compliance fails audit due to missing `traced_to` persistence in non-Evidence domains.
6. Supersede/version reporting queries cannot be generalized across aggregates due to inconsistent chain modeling.
7. Mixed SQL dialect assumptions break automated tooling and linting.
8. Soft-delete behavior diverges across tables causing orphaned active links.
9. Recommendation supersede logic is not physically linked, causing inconsistent historical chain reconstruction.
10. Cross-domain archival semantics differ (`state` only vs timestamps), breaking unified archive reporting.

---

# C. Backend Implementation Failure Scenarios

1. Contract mismatch between services over session terminal states.
2. Event bus consumers silently ignore alternate event names.
3. Assessment and Knowledge service boundaries blur on mastery updates.
4. Recommendation may accidentally auto-apply actions without strict approval gates.
5. Discovery output DTO lacks strict required fields for Goal creation.
6. Explainability fields missing in some API responses despite policy requirement.
7. Mentor session lifecycle ownership race between Learning Session orchestration and Teaching orchestration.
8. Integration tests fail due to ambiguous canonical doc source.
9. Historical/audit endpoints cannot provide uniform version history.
10. Rollback/replay behavior unreliable due to non-canonical event semantics.

---

# D. Top 20 Blockers (Ranked)

1. P0 — LearningSession state conflict (`Abandoned` vs `Archived`)  
2. P0 — Explainability persistence not universal (`traced_to` missing/inconsistent)  
3. P0 — Ownership ambiguity for `knowledge_node_mastery` interpretation  
4. P0 — Ownership ambiguity for `mentor_session` persistence owner  
5. HIGH — Evidence event semantic duplication (`Recorded`/`Added`/`Collected`)  
6. HIGH — Roadmap approval event semantic overlap (`RoadmapApproved` vs node-approved flows)  
7. HIGH — Mixed SQL artifact maturity (executable vs commented pseudo-DDL)  
8. HIGH — Missing canonical event dictionary enforced system-wide  
9. HIGH — Missing canonical state dictionary enforced system-wide  
10. HIGH — Recommendation supersede/version chain not explicit in physical model  
11. HIGH — Goal/Roadmap archive timestamp consistency not standardized  
12. HIGH — Discovery→Goal handoff contract not locked as strict schema  
13. HIGH — Global idempotency/debounce contract absent for cyclical signal flow  
14. MEDIUM — Roadmap↔Knowledge mapping anti-orphan semantics incomplete  
15. MEDIUM — Soft-delete policy not uniformly expressed across domains  
16. MEDIUM — TraceLink modeling strategy inconsistent (array vs table vs blob)  
17. MEDIUM — Cross-domain audit actor fields vary in strictness  
18. MEDIUM — Decision header linkage appears optional in critical tables  
19. LOW — Legacy draft terminology still present in some architecture docs  
20. LOW — Read-consumer matrices not fully centralized

---

# E. Canonicalization Plan

## P0 Canonicalization Pack
1. Publish **single canonical state dictionary** (all domains, all terminal states).
2. Publish **single canonical event catalog** with semantic ownership and deprecations.
3. Publish **single ownership registry** (aggregate/table → sole write owner).
