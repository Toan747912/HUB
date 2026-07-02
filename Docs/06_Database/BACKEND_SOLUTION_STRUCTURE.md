# BACKEND_SOLUTION_STRUCTURE.md

> Scope: implementation planning only.  
> Inputs are frozen: locked Decisions, finalized DDL rounds, Backend Module Architecture, Application Services Architecture, API Architecture, Explainability Architecture, Decision Persistence Architecture, and RLS Architecture.  
> No redesign, no new domain/entities/tables/mechanisms.

---

## 1. Solution structure goals

1. Keep **module boundaries identical** to locked architecture.
2. Separate **business modules** from **infrastructure adapters**.
3. Keep **Shared Kernel** as pure contract/types (no business behavior).
4. Keep internal-only cross-cutting services (`ExplainabilityService`, `DecisionPersistenceService`) non-public.
5. Make background/event execution first-class without coupling to HTTP layer.

---

## 2. Final Apps/backend folder tree

```text
Apps/backend/
├─ README.md
├─ package.json
├─ tsconfig.json                         # or jsconfig if JS runtime chosen
├─ .env.example
├─ src/
│  ├─ main/                              # app bootstrap entry
│  │  ├─ app.ts
│  │  ├─ server.ts
│  │  └─ container.ts                    # DI composition root
│  │
│  ├─ api/                               # API responsibilities
│  │  ├─ http/
│  │  │  ├─ middleware/
│  │  │  │  ├─ auth-context.middleware.ts
│  │  │  │  ├─ error-handler.middleware.ts
│  │  │  │  ├─ request-id.middleware.ts
│  │  │  │  └─ validation.middleware.ts
│  │  │  ├─ routes/
│  │  │  │  ├─ identity.routes.ts
│  │  │  │  ├─ goal-roadmap.routes.ts
│  │  │  │  ├─ learning-session.routes.ts
│  │  │  │  ├─ evidence.routes.ts
│  │  │  │  ├─ assessment.routes.ts
│  │  │  │  ├─ discovery.routes.ts
│  │  │  │  ├─ recommendation.routes.ts
│  │  │  │  ├─ mentor-interaction.routes.ts
│  │  │  │  ├─ teaching.routes.ts
│  │  │  │  └─ learning-profile.routes.ts
│  │  │  ├─ controllers/
│  │  │  ├─ dto/
│  │  │  └─ presenters/
│  │  └─ internal/                       # non-public internal APIs if needed
│  │
│  ├─ modules/
│  │  ├─ core/
│  │  │  ├─ identity/
│  │  │  │  ├─ application/
│  │  │  │  │  ├─ commands/             # AnonymizeLearner
│  │  │  │  │  └─ queries/              # GetLearnerProfile
│  │  │  │  ├─ domain/
│  │  │  │  ├─ contracts/               # repository/service ports
│  │  │  │  └─ infrastructure-binding/  # module-local wiring
│  │  │  │
│  │  │  ├─ goal-roadmap/
│  │  │  │  ├─ application/
│  │  │  │  ├─ domain/
│  │  │  │  ├─ contracts/
│  │  │  │  └─ infrastructure-binding/
│  │  │  │
│  │  │  ├─ knowledge-graph/
│  │  │  │  ├─ application/
│  │  │  │  ├─ domain/
│  │  │  │  ├─ contracts/
│  │  │  │  └─ infrastructure-binding/
│  │  │  │
│  │  │  ├─ evidence/
│  │  │  │  ├─ application/
│  │  │  │  ├─ domain/
│  │  │  │  ├─ contracts/
│  │  │  │  └─ infrastructure-binding/
│  │  │  │
│  │  │  ├─ assessment/
│  │  │  │  ├─ application/
│  │  │  │  ├─ domain/
│  │  │  │  ├─ contracts/
│  │  │  │  └─ infrastructure-binding/
│  │  │  │
│  │  │  ├─ discovery/
│  │  │  │  ├─ application/
│  │  │  │  ├─ domain/
│  │  │  │  ├─ contracts/
│  │  │  │  └─ infrastructure-binding/
│  │  │  │
│  │  │  ├─ mentor-interaction/
│  │  │  │  ├─ application/
│  │  │  │  ├─ domain/
│  │  │  │  ├─ contracts/
│  │  │  │  └─ infrastructure-binding/
│  │  │  │
│  │  │  ├─ recommendation/
│  │  │  │  ├─ application/
│  │  │  │  ├─ domain/
│  │  │  │  ├─ contracts/
│  │  │  │  └─ infrastructure-binding/
│  │  │  │
│  │  │  └─ learning-session/
│  │  │     ├─ application/
│  │  │     ├─ domain/
│  │  │     ├─ contracts/
│  │  │     └─ infrastructure-binding/
│  │  │
│  │  ├─ supporting/
│  │  │  ├─ teaching/
│  │  │  │  ├─ application/
│  │  │  │  ├─ contracts/
│  │  │  │  └─ infrastructure-binding/
│  │  │  ├─ explainability/
│  │  │  │  ├─ application/             # internal only
│  │  │  │  ├─ contracts/
│  │  │  │  └─ infrastructure-binding/
│  │  │  ├─ decision-persistence/
│  │  │  │  ├─ application/             # internal only
│  │  │  │  ├─ contracts/
│  │  │  │  └─ infrastructure-binding/
│  │  │  └─ learning-profile/
│  │  │     ├─ application/
│  │  │     ├─ contracts/
│  │  │     └─ infrastructure-binding/
│  │  │
│  │  └─ shared-kernel/
│  │     ├─ ids/
│  │     ├─ events/
│  │     ├─ decisions/
│  │     ├─ tracing/
│  │     └─ errors/
│  │
│  ├─ infrastructure/
│  │  ├─ persistence/                    # Persistence Infrastructure Module
│  │  │  ├─ supabase/
│  │  │  │  ├─ client.factory.ts
│  │  │  │  ├─ query/
│  │  │  │  └─ repositories/
│  │  │  ├─ mappers/
│  │  │  └─ transactions/
│  │  ├─ auth/                           # Supabase Auth Integration Module
│  │  │  ├─ token-verifier.ts
│  │  │  ├─ auth-context.ts
│  │  │  └─ middleware/
│  │  ├─ ai-provider/                    # AI Provider Infrastructure Module
│  │  │  ├─ ports/
│  │  │  ├─ local-adapter/
│  │  │  ├─ cloud-adapter/
│  │  │  └─ policies/
│  │  ├─ event-bus/                      # Event Bus Infrastructure Module
│  │  │  ├─ publisher.ts
│  │  │  ├─ subscriber.ts
│  │  │  ├─ handlers/
│  │  │  └─ dead-letter/
│  │  └─ background-jobs/                # Background Jobs Infrastructure Module
│  │     ├─ workers/
│  │     ├─ retry/
│  │     ├─ scheduler/
│  │     └─ monitors/
│  │
│  ├─ jobs/                              # registration of async workers
│  │  ├─ bootstrap-jobs.ts
│  │  └─ consumers/
│  │
│  ├─ observability/
│  │  ├─ logger/
│  │  ├─ metrics/
│  │  └─ tracing/
│  │
│  ├─ config/
│  │  ├─ env.ts
│  │  ├─ feature-flags.ts
│  │  └─ security.ts
│  │
│  └─ test/
│     ├─ unit/
│     ├─ integration/
│     ├─ contract/
│     └─ e2e/
└─ scripts/
   ├─ dev/
   ├─ migration/
   └─ ops/
```

---

## 3. Mapping of all 19 modules

### 3.1 Core Modules (9)

1. Identity  
2. Goal & Roadmap  
3. Knowledge Graph  
4. Evidence  
5. Assessment  
6. Discovery  
7. Mentor Interaction  
8. Recommendation  
9. Learning Session

### 3.2 Supporting Modules (4)

10. Teaching  
11. Explainability  
12. Decision Persistence  
13. Learning Profile

### 3.3 Infrastructure Modules (5)

14. Persistence Infrastructure  
15. Supabase Auth Integration  
16. AI Provider Infrastructure  
17. Event Bus Infrastructure  
18. Background Jobs Infrastructure

### 3.4 Shared Component (1)

19. Shared Kernel

---

## 4. SharedKernel responsibilities (frozen)

SharedKernel contains only reusable contracts/types used by multiple modules:

- `LearnerId` and identity primitives aligned with DECISION-043.
- Domain event envelope contracts.
- Decision taxonomy contracts (`D1…D9b`) without business logic.
- Trace reference contract shape for Explainability service calls.
- Cross-module error base types and result wrappers.

**Must not contain:** domain workflow logic, repository implementations, or module-specific policies.

---

## 5. Infrastructure responsibilities

### 5.1 Persistence Infrastructure
- Implement repository ports defined by modules.
- Manage Supabase/Postgres transactions and query execution.
- Keep SQL/access details outside module application layer.

### 5.2 Supabase Auth Integration
- Verify JWT and extract `learner_id` context.
- Build request auth context for API and internal commands.
- Keep `auth.users` operations aligned with frozen auth flow.

### 5.3 AI Provider Infrastructure
- Provide `Invoke(decision_type, inputs)` port adapters.
- Support local and cloud execution modes behind one port.
- Enforce Cloud AI boundary: no DB credentials, backend-mediated payload only.

### 5.4 Event Bus Infrastructure
- Publish/subscribe mechanics for domain/application events.
- Dead-letter queue integration and consumer lag monitoring hooks.
- No ownership of business semantics.

### 5.5 Background Jobs Infrastructure
- Retry failed consumers.
- Re-drive dead-letter messages.
- Run scheduled/maintenance workers without direct business ownership changes.

---

## 6. API responsibilities

API layer is a transport adapter only:

- Accept HTTP requests and route to application commands/queries.
- Run auth middleware, validation middleware, and error mapping.
- Map DTO ↔ application contracts.
- Enforce “Never Public” boundary:
  - `ExplainabilityService` and `DecisionPersistenceService` are internal only.
- Keep business decisions inside module application services.

---

## 7. Background Job responsibilities

- Start async consumers for events that require eventual handling.
- Execute retry policy for failed handlers.
- Emit system-level operational alerts (`ConsumerLagAlert`, dead-letter events).
- Re-publish failed domain events after policy checks.
- Must not bypass module write-ownership rules even under `service_role`.

---

## 8. Boundary enforcement checklist (structure level)

1. Each aggregate has one write-owner module only.
2. Module contracts are inward-facing; infra implements outward adapters.
3. Shared tables and strict RLS tables are accessed through module repositories, not random direct calls.
4. `trace_link` access only through Explainability supporting module.
5. Decision registration only through Decision Persistence supporting module.
6. Background jobs call module entry points, not raw table mutation scripts.

---

## 9. BACKEND_IMPLEMENTATION_READINESS_ASSESSMENT

| Dimension | Score | Status | Rationale |
|---|---:|---|---|
| Architecture Readiness | 92/100 | High | Module catalog and boundaries are frozen and complete. |
| Database Readiness | 78/100 | Medium-High | DDL batches done; Batch 6/7 still gating production-grade enforcement. |
| API Readiness | 85/100 | High | Command/query surfaces are already defined; transport mapping can start. |
| Module Readiness | 84/100 | High | 19-module mapping complete; implementation order still required. |
| AI Integration Readiness | 61/100 | Medium | AI provider boundary is clear, but real provider wiring and ops hardening pending. |
| MVP Readiness | 80/100 | Medium-High | Enough frozen inputs to start staged delivery immediately. |

**Overall:** backend implementation planning is ready to execute without architecture redesign.
