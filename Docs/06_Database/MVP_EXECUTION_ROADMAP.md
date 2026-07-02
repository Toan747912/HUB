# MVP_EXECUTION_ROADMAP.md

> Scope: execution roadmap for a working product, using frozen architecture only.  
> No new decisions, no new domains/entities/tables.

---

## 1. Roadmap principles

1. Deliver working vertical slices, not isolated module code.
2. Keep all commands through backend orchestration.
3. Keep Explainability and Decision Persistence internal-only.
4. Respect write ownership boundaries and frozen dependency order.
5. Gate security hardening on Batch 6 and migration confidence on Batch 7.

---

## 2. Phase roadmap (8 phases)

## Phase 1 — Database Integration

### Objectives
- Connect backend to finalized schema from completed DDL batches.
- Establish repository adapters and transaction boundaries.
- Prepare migration execution hooks and test environment bootstrap.

### Deliverables
- Persistence infrastructure operational.
- Repository implementations for existing tables in frozen scope.
- Integration test harness for DB round-trip and transactions.

### Dependencies
- Completed DDL batches (already done).
- Infrastructure module scaffolding.
- Environment secret management baseline.

### Completion criteria
- Backend can read/write staging DB through repository interfaces.
- Core transaction wrapper tested.
- No schema redesign introduced.

---

## Phase 2 — Identity

### Objectives
- Implement learner identity flows aligned with Supabase auth mapping.
- Provide query for learner profile and command for anonymization workflow.

### Deliverables
- Identity module commands/queries live.
- Auth middleware extracting `learner_id`.
- Identity API endpoints integrated.

### Dependencies
- Phase 1 complete.
- Supabase Auth Integration infrastructure available.

### Completion criteria
- Authenticated request resolves learner context correctly.
- Get profile and anonymization flow functional in staging.
- No direct architecture deviation from DECISION-043 flow.

---

## Phase 3 — Learning Session

### Objectives
- Implement orchestration lifecycle for learning sessions and sub-sessions.
- Persist transitions for operational trace of session state.

### Deliverables
- Learning Session command handlers:
  - start/pause/resume/complete/archive
  - sub-session start/end
- Session query handlers:
  - current session
  - session history

### Dependencies
- Phase 2 Identity context.
- Goal & Roadmap baseline command/query availability.

### Completion criteria
- End-to-end session lifecycle works for one learner.
- Transition rows recorded for all state transitions.
- Command guards and state machine constraints enforced in app layer.

---

## Phase 4 — Knowledge + Evidence

### Objectives
- Enable knowledge graph read and expansion service handling.
- Capture learner evidence and links as downstream signals.

### Deliverables
- Knowledge Graph module query/service path.
- Evidence capture and evidence history paths.
- Event emission for `EvidenceRecorded`.

### Dependencies
- Phase 1 persistence and event bus.
- Phase 3 session context for submission flows.

### Completion criteria
- Evidence submission persists and emits expected event.
- Knowledge graph context query works for authenticated learner flows.
- No direct frontend write path bypasses command orchestration.

---

## Phase 5 — Assessment

### Objectives
- Evaluate evidence into assessment results.
- Update knowledge mastery as sole assessment write-owner.
- Ensure explainability linkage write call is integrated.

### Deliverables
- Assessment event consumer for `EvidenceRecorded`.
- `AssessmentResult` + `KnowledgeNodeMastery` persistence.
- Explainability internal service call from assessment pipeline.

### Dependencies
- Phase 4 evidence signal availability.
- Explainability module internal entrypoint.

### Completion criteria
- Assessment runs from evidence signal to persisted result.
- Mastery updates are consistent and test-covered.
- Trace link creation call exists in same business operation path.

---

## Phase 6 — Recommendation

### Objectives
- Aggregate assessment/discovery/session signals into recommendation proposals.
- Publish recommendation events for downstream orchestration.

### Deliverables
- Recommendation service signal consumers.
- Recommendation proposal persistence and query path.
- Event publication (`RecommendationProposed`).

### Dependencies
- Phase 5 assessment outputs.
- Discovery signal source (at least baseline).
- Explainability internal service availability.

### Completion criteria
- Recommendation proposal generated from regression/mismatch scenario.
- Query returns active recommendations by learner.
- Pause-type recommendation can be consumed by Learning Session flow.

---

## Phase 7 — Teaching

### Objectives
- Deliver content/intervention selection orchestration.
- Integrate AI invocation boundary with stub or real adapter.
- Register decisions through Decision Persistence internal service.

### Deliverables
- Teaching query endpoint for selected content.
- AI provider port integration (stub first, real later).
- Decision registration internal calls.

### Dependencies
- Phase 6 recommendation.
- Phase 5 assessment + mastery reads.
- Goal/Roadmap + KnowledgeGraph read contexts.

### Completion criteria
- Teaching outputs selected content for active session context.
- Decision registration call path is wired for applicable decisions.
- No direct external exposure of decision persistence internals.

---

## Phase 8 — Mentor Interaction

### Objectives
- Run mentor session lifecycle and mode transitions.
- Present teaching-selected content and capture learner responses.
- Complete closed learning loop: mentor → evidence → assessment → recommendation.

### Deliverables
- Mentor Interaction module command/query endpoints.
- Sync handoff to Evidence capture service.
- Session-mode handling and related events.

### Dependencies
- Phase 3 Learning Session.
- Phase 4 Evidence.
- Phase 7 Teaching outputs.

### Completion criteria
- Learner can run mentor session and submit responses.
- Submission triggers downstream assessment/recommendation loop.
- MVP-level user flow is demonstrable end-to-end.

---

## 3. Cross-phase gating constraints

### Batch 6 dependency
- Secure role behavior validation and RLS-integrated tests.
- Hardening for shared-read and never-exposed boundaries.

### Batch 7 dependency
- Migration validation sign-off before production release.
- Rollback and deployment safety checks passed.

### AI real provider dependency
- Required for production-quality teaching/advanced decision behavior.
- Optional for earlier MVP slice with deterministic stub adapter.

---

## 4. MVP completion definition

MVP is complete when:
1. Authenticated learner identity is resolved in backend.
2. Learner can run a learning session and mentor interaction.
3. Responses produce evidence.
4. Evidence triggers assessment.
5. Assessment/discovery signals produce recommendations.
6. Teaching returns selected content for mentor flow.
7. Core queries return coherent state to frontend.
8. Security and migration gates (Batch 6/7) are satisfied for release target.

---

## 5. Suggested execution timeline (indicative)

- Phase 1-2: Foundation + Identity
- Phase 3-4: Session + Knowledge/Evidence
- Phase 5-6: Assessment + Recommendation
- Phase 7-8: Teaching + Mentor Interaction
- Security/migration hardening overlays after Batch 6/7 completion

---

## 6. BACKEND_IMPLEMENTATION_READINESS_ASSESSMENT

| Dimension | Score | Status | Rationale |
|---|---:|---|---|
| Architecture Readiness | 93/100 | High | Frozen architecture fully supports phased execution. |
| Database Readiness | 78/100 | Medium-High | DDL done; Batch 6/7 remain for full release confidence. |
| API Readiness | 86/100 | High | API architecture already defines command/query boundaries needed for phases. |
| Module Readiness | 85/100 | High | Module implementation order and prerequisites are explicit. |
| AI Integration Readiness | 62/100 | Medium | Stub path is ready; real-provider path still operationally gated. |
| MVP Readiness | 84/100 | High | Eight-phase roadmap can deliver a working product progressively. |

**Final verdict:** MVP backend execution is ready to start immediately with phased delivery, while production-grade security/release remains gated by Batch 6 and Batch 7 completion.
