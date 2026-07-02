# BACKEND_BOOTSTRAP_PLAN.md

> Scope: coding bootstrap plan only.  
> No redesign. Uses frozen architecture and dependency decisions.

---

## 1. Bootstrap objective

Start backend implementation immediately while separating:
- what is safe to code now,
- what must wait for RLS authoring completion (Batch 6),
- what must wait for migration validation completion (Batch 7),
- what must wait for real AI provider integration.

---

## 2. Work classification

## A) Can start immediately

### A.1 Foundation and structure
- Create final backend folder/module skeleton (19 modules + shared kernel).
- Establish DI/container composition and module registration.
- Build shared contracts, IDs, domain event envelope, error primitives.
- Implement API middleware scaffolding (auth-context pipe, request ID, validation, error mapping).
- Implement repository interfaces in module contracts (no schema redesign).

### A.2 Core non-blocked module implementation
- Identity module command/query handlers (with mocked or staging persistence adapter).
- Goal & Roadmap command/query handler scaffolds.
- Learning Session orchestration command/query scaffolds.
- Evidence capture/query flows.
- Event publishing/subscription pipeline skeleton.
- Background retry/dead-letter framework skeleton.
- Learning Profile projection query service scaffold.

### A.3 Internal supporting modules (code-level)
- Explainability service interface + internal-only entrypoint.
- Decision Persistence service interface + internal-only entrypoint.
- Teaching service orchestration shell (without real provider dependency).
- Mentor Interaction orchestration shell with Evidence handoff.

### A.4 Test harness
- Unit test scaffolding for application services.
- Contract tests for repository interfaces.
- Integration test skeleton (local Supabase emulator or mocked adapters).

---

## B) Requires Batch 6 completion (RLS authoring)

Batch 6 produces enforceable RLS SQL and policy review for secure role behavior.  
The following should wait for final integration/hardening:

1. Finalize direct Frontend read surfaces relying on RLS behavior:
   - `evidence`
   - `evidence_link`
   - `learning_session_transition`
   - Shared reads (`knowledge_node`, `knowledge_edge`, `expansion_record`)

2. Finalize secure deployment behavior for:
   - `trace_link` never-exposed guarantees.
   - Shared knowledge read-only semantics for authenticated.
   - anon/authenticated policy expectation mapping in API edge tests.

3. Execute role-based integration tests against real policy SQL:
   - `anon`
   - `authenticated`
   - service bypass implications validation in code discipline.

4. Finalize auth + API security runbook sections that depend on actual policy statements.

---

## C) Requires Batch 7 completion (migration validation)

Batch 7 confirms migration safety, ordering, and deployment confidence.  
The following should wait for production cutoff:

1. Production migration pipeline lock-in.
2. Staging-to-production promotion gates for DB schema + RLS.
3. Full end-to-end tests against validated migrations.
4. Data integrity and rollback drill acceptance.
5. Release readiness sign-off for backend modules that depend on strict schema invariants.

---

## D) Requires real AI provider integration

These items can be coded with stubs now, but completion needs real provider wiring:

1. AI Provider Infrastructure adapters (cloud adapter credentials/network).
2. Teaching service runtime decision quality path (D1, D9b execution path).
3. Assessment/discovery/recommendation calls that require model invocation or external inference dependency.
4. Observability for provider latency/failure/cost controls.
5. Security controls ensuring Cloud AI never receives DB credentials and only receives backend-prepared payload.

---

## 3. Bootstrap execution slices

### Slice S1 (Week 1)
- Folder structure + container + shared kernel + middleware.
- Identity/Goal/LearningSession module scaffolding.
- Event bus and job framework scaffolding.

### Slice S2 (Week 2)
- Evidence + KnowledgeGraph + Assessment scaffolding.
- Explainability internal integration.
- Recommendation + Discovery skeleton.

### Slice S3 (Week 3)
- Teaching + Mentor Interaction + Learning Profile.
- Decision Persistence internal flow.
- End-to-end flow with mocked AI and staged DB adapter.

### Slice S4 (Post Batch 6)
- Apply RLS-integrated tests, auth edge hardening, direct-read policy assertions.

### Slice S5 (Post Batch 7)
- Migration-validated staging rehearsal and production readiness pipeline.

### Slice S6 (AI integration)
- Real provider adapters, resilience policy, operational controls.

---

## 4. Deliverables by gate

| Gate | Deliverables |
|---|---|
| Immediate | Module skeleton, commands/queries scaffolds, events, jobs, tests baseline |
| Batch 6 done | Policy-aware integration tests, access control hardening, secure direct-read validation |
| Batch 7 done | Migration-safe release playbook, production deployment checklist passed |
| AI provider done | Real inference path, failure handling, observability and cost/security controls |

---

## 5. Risk controls during bootstrap

1. Do not expose internal supporting modules via public API routes.
2. Keep write ownership within frozen module boundaries.
3. Use stubs for AI until provider integration gate opens.
4. Avoid assumptions about policy behavior until Batch 6 SQL is finalized and applied.
5. Freeze migration assumptions until Batch 7 validation report passes.

---

## 6. Start-now coding board (practical)

- [ ] Backend tree + module package boundaries
- [ ] SharedKernel contracts
- [ ] API middleware baseline
- [ ] DI container
- [ ] Repository ports + fake adapters
- [ ] Identity command/query handlers
- [ ] Goal/Roadmap command/query handlers
- [ ] LearningSession command/query handlers
- [ ] Event bus publisher/subscriber shell
- [ ] Jobs retry/dead-letter shell
- [ ] Evidence/Assessment/Recommendation flow skeleton
- [ ] Teaching/MentorInteraction/LearningProfile skeleton

---

## 7. BACKEND_IMPLEMENTATION_READINESS_ASSESSMENT

| Dimension | Score | Status | Rationale |
|---|---:|---|---|
| Architecture Readiness | 92/100 | High | Frozen module + service architecture is implementation-ready. |
| Database Readiness | 77/100 | Medium-High | Core schema ready; Batch 6/7 are explicit remaining gates. |
| API Readiness | 84/100 | High | API architecture and command/query boundaries are stable. |
| Module Readiness | 85/100 | High | Immediate coding can begin with clear gate partitioning. |
| AI Integration Readiness | 58/100 | Medium-Low | Stub-ready now; real provider still operationally gated. |
| MVP Readiness | 82/100 | Medium-High | A phased bootstrap allows shipping progress before full closure. |

**Verdict:** backend implementation should start now with staged gate enforcement tied to Batch 6, Batch 7, and AI provider integration.
