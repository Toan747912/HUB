# Critical Path Analysis — Phase 2

## Scope

This analysis identifies:

- first implementation package
- highest risk package
- database-first dependencies
- event-flow dependencies
- integration bottlenecks
- critical blockers
- recommended execution sequence
- go/no-go criteria for each phase gate

This is planning documentation only.

---

## 1. First Implementation Package

## Selected first package
**WP-01 SQL Consolidation**

### Rationale
1. All downstream packages rely on stable schema and ownership certainty.
2. Existing closure artifacts show strong SQL baseline readiness but still identify gate-critical policy/release dependencies.
3. Consolidation is the lowest-risk path to establish unambiguous execution contracts before repository/event/domain build-out.

### Entry Conditions
- Phase 1 closure accepted.
- SQL baseline artifacts available and indexed.
- Debt register baseline accepted for prioritization.

### Exit Conditions
- Consolidated SQL baseline and unresolved-item map published.
- Explicit feed into canonical schema generation (WP-02).

---

## 2. Highest Risk Package

## Selected highest risk package
**WP-06 AI Capability Runtime Integration**

### Risk Drivers
1. External provider dependency (credentials, network, reliability, cost controls).
2. Runtime failure modes and fallback complexity.
3. Security and observability requirements crossing module boundaries.
4. Tight coupling risk with teaching outcomes and user-facing loop quality.

### Risk Classification
**High**

### Risk Controls
- Stub-first rollout path.
- Strict runtime boundary contracts.
- Traceability and decision/explainability correlation enforcement.
- Controlled promotion criteria from stub mode to real-provider mode.

---

## 3. Database-First Dependencies

The following dependencies must be treated as database-first and validated before broad backend progression:

1. **SQL baseline closure dependency**
   - Repository contracts and canonical schema cannot stabilize without SQL consolidation.

2. **Canonical ownership dependency**
   - Domain/repository boundaries require authoritative table-to-module mapping.

3. **Policy gate dependency (Batch 6)**
   - Production security posture depends on RLS completion, including cross-cutting strategy clarity.

4. **Migration confidence dependency (Batch 7)**
   - Release readiness requires validated migration ordering, rollback strategy, and safety certification.

5. **Cross-cutting trace/decision persistence governance dependency**
   - Explainability and Decision Persistence paths require secure, consistent policy alignment before release qualification.

---

## 4. Event-Flow Dependencies

Critical event-flow chain for intelligence and intervention loop:

1. **EvidenceRecorded**
   - Upstream producer: Evidence
   - Downstream consumers: Assessment (primary), Discovery/Recommendation pathways (indirect)

2. **Assessment-complete signal**
   - Upstream producer: Assessment
   - Downstream consumers: Discovery, Recommendation

3. **RecommendationProposed**
   - Upstream producer: Recommendation
   - Downstream consumers: Learning Session, Teaching

4. **Teaching invocation/result flow**
   - Upstream producer: Teaching
   - Downstream: AI Runtime path and mentor loop continuity

### Event-flow prerequisites
- Event contract consistency
- Delivery reliability strategy (retry/dead-letter/idempotency)
- Cross-module dependency direction compliance
- Traceability hooks for explainability and operational audit

---

## 5. Integration Bottlenecks

1. **Repository/Event boundary synchronization**
   - Misalignment in ownership can create invalid cross-module writes.

2. **Recommendation ↔ Learning Session ↔ Teaching coordination**
   - Multi-module state dependency concentration.

3. **Cross-cutting explainability and decision capture**
   - Internal-only boundaries require strict invocation discipline.

4. **AI provider runtime integration**
   - External dependency complexity and runtime reliability constraints.

5. **Security and release gate synchronization**
   - Batch 6/7 outcomes can delay promotion despite implementation progress.

---

## 6. Critical Blockers

1. Batch 6 RLS policy completion and validation.
2. Batch 7 migration confidence and release safety sign-off.
3. Cross-cutting RLS strategy closure for trace/decision persistence patterns.
4. Explainability H-10 formal decision path resolution.
5. Deployment topology confirmation for production confidence path.

---

## 7. Recommended Execution Sequence

## Phase 2 sequence
1. **WP-01 SQL Consolidation**
2. **WP-02 Canonical Database Schema Generation**
3. **WP-03 Repository Layer**
4. **WP-04 Domain Event Bus**
5. **WP-05 Backend Domain Implementation**
6. **WP-06 AI Capability Runtime Integration**
7. **WP-07 Automated Testing**
8. **WP-08 CI/CD Preparation**

## Parallelization guidance
- WP-03 and WP-04 can partially overlap after WP-02 baseline lock.
- WP-07 should begin early in matrix-definition mode, then expand as WP-03/04/05 outputs stabilize.
- WP-08 policy drafting can start early, but enforcement activation should follow WP-07 baseline completion.

---

## 8. Go/No-Go Criteria by Phase Gate

## Gate G1 — Data Foundation Gate (after WP-01 + WP-02)
### Go if
- SQL baseline consolidated and canonical schema accepted.
- Module ownership and dependency mapping unambiguous.
### No-Go if
- Any unresolved schema ownership ambiguity remains.
- Blocking SQL debt remains unplanned/unowned.

## Gate G2 — Integration Foundation Gate (after WP-03 + WP-04)
### Go if
- Repository contracts align with ownership boundaries.
- Event contracts and delivery/retry/idempotency strategy accepted.
### No-Go if
- Forbidden dependency paths appear in repository/event interfaces.
- Critical event contracts are undefined or conflicting.

## Gate G3 — Domain Execution Gate (during WP-05 progression)
### Go if
- Module implementation follows approved dependency chain.
- Core signal chain (Evidence→Assessment→Recommendation) is operationally coherent.
### No-Go if
- Core chain is broken or requires boundary-violating shortcuts.
- Cross-module write ownership is violated.

## Gate G4 — Runtime Quality Gate (after WP-06 + WP-07)
### Go if
- Stub-to-runtime integration path is validated.
- Automated tests cover critical path, blockers, and event chains.
### No-Go if
- AI runtime lacks traceability/reliability controls.
- Critical path regression testing is incomplete.

## Gate G5 — Release Preparation Gate (after WP-08)
### Go if
- CI/CD enforces mandatory quality/security/release checks.
- Batch 6/7-related release confidence requirements are satisfied.
### No-Go if
- Security/migration gates remain open.
- Release qualification cannot be objectively evidenced from pipeline outputs.

---

## 9. Critical Path Summary

Primary critical path:

SQL Consolidation  
→ Canonical Schema  
→ Repository Layer  
→ Domain Event Bus  
→ Backend Domain Implementation (Evidence→Assessment→Recommendation chain)  
→ Teaching + AI Runtime integration  
→ Automated Testing qualification  
→ CI/CD gate enforcement

Any delay in these nodes delays safe execution-to-release progression.
