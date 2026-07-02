# Technical Debt Register — Phase 2 Entry

## Classification Legend
- **Blocking Debt**: prevents safe execution of core Phase 2 path or phase-gate progression.
- **High Priority Debt**: does not fully block start, but materially increases execution/release risk.
- **Non-Blocking Debt**: should be addressed for quality/scalability, not immediate blockers.
- **Deferred Enhancements**: intentional postponements to later phases.

---

## A. Blocking Debt

| ID | Description | Impact | Risk | Recommended Resolution | Target Phase |
|---|---|---|---|---|---|
| TD-BLK-01 | Batch 6 RLS policy authoring not completed across schema surfaces. | Prevents production-safe data access posture and secure API exposure. | High | Execute RLS policy package for all governed tables, validate with role matrix and integration tests. | Phase 2 (early gate) |
| TD-BLK-02 | Batch 7 migration/release confidence gate not completed. | Production release confidence incomplete (rollback/safety not certified). | High | Run migration validation suite, rollback drills, and release-safety sign-off. | Phase 2 (pre-release gate) |
| TD-BLK-03 | Cross-cutting RLS strategy unresolved for Explainability/Decision Persistence patterns without direct learner_id pathing. | Security policy ambiguity for internal trace/decision records can block secure deployment certification. | High | Define and approve RLS access strategy via controlled join-path/resource ownership model; validate query plans and policy behavior. | Phase 2 (SQL consolidation + security gate) |
| TD-BLK-04 | Critical unresolved explainability gap H-10 (`trace_link.target_type` missing `self_assessment_mismatch`) remains open by design freeze constraints. | Trace completeness and explainability consistency remain conditionally incomplete for some flows. | High | Raise formal architecture decision for enum extension, then apply controlled schema patch in approved phase. | Phase 2 (governed design decision window) |

---

## B. High Priority Debt

| ID | Description | Impact | Risk | Recommended Resolution | Target Phase |
|---|---|---|---|---|---|
| TD-HI-01 | Decision header enforcement gap (R5-03) relies on application discipline instead of strong DB-level guarantees on patched rows. | Inconsistent write behavior possible under integration drift. | Medium-High | Add application-layer invariant tests and repository guardrails; evaluate phased DB constraint hardening strategy. | Phase 2 |
| TD-HI-02 | Deployment topology decision (monolith vs selective service split) not finalized, especially for cross-cutting/high-load services. | Capacity planning and reliability strategy remain under-specified. | High | Conduct deployment architecture review with SLO and bottleneck modeling before CI/CD hardening completion. | Phase 2 |
| TD-HI-03 | Mentor Interaction ↔ Evidence tight coupling flagged as architecture risk. | Could reduce maintainability and increase integration fragility under change. | Medium-High | Evaluate event-mediated decoupling option (e.g., saga/outbox pattern) and document accepted trade-off. | Phase 2 |
| TD-HI-04 | Real AI provider operationalization still gated (credentials/network/security/runtime controls). | AI runtime cannot be considered production-hardened. | Medium-High | Keep stub-first baseline; define provider readiness checklist and controlled rollout criteria. | Phase 2 |

---

## C. Non-Blocking Debt

| ID | Description | Impact | Risk | Recommended Resolution | Target Phase |
|---|---|---|---|---|---|
| TD-NB-01 | End-to-end event choreography tests are not fully automated for all downstream chains. | Regression detection latency for multi-module interactions. | Medium | Add contract + integration event-chain test packs in automated testing WP. | Phase 2 |
| TD-NB-02 | Learning Profile projection optimization not yet validated against realistic data volume. | Potential read-performance degradation at scale. | Medium | Add projection performance benchmarks and index/query-plan review. | Phase 2/3 |
| TD-NB-03 | AI runtime observability and trace correlation coverage not fully standardized. | Troubleshooting and auditability effort increases. | Medium | Extend tracing standards across runtime calls and event transitions. | Phase 2 |
| TD-NB-04 | Cross-module quality gates are documented but not fully codified into CI policy gates. | Inconsistent enforcement between teams/environments. | Medium | Convert policy docs into mandatory CI checks and merge gates. | Phase 2 |

---

## D. Deferred Enhancements

| ID | Description | Impact | Risk | Recommended Resolution | Target Phase |
|---|---|---|---|---|---|
| TD-DEF-01 | Advanced AI provider optimization (multi-model routing, adaptive fallback) postponed. | Reduced optimization/headroom, no immediate MVP block. | Low-Medium | Implement after baseline runtime stability and reliability metrics are achieved. | Phase 3 |
| TD-DEF-02 | Extended explainability analytics/reporting surfaces beyond required internal trace path. | Lower insight depth for advanced governance use-cases. | Low | Add advanced reporting after core trace integrity + security gates close. | Phase 3 |
| TD-DEF-03 | Progressive decomposition of selected modules into separate deployable units deferred. | Slower path to independent scaling domains. | Medium | Revisit after initial production telemetry identifies real bottlenecks. | Phase 3 |
| TD-DEF-04 | Advanced policy simulation tooling for RLS/authorization change previews postponed. | Slower iteration on security policy evolution. | Low | Build simulation harness after baseline policy set is stable and audited. | Phase 3 |

---

## Debt Governance Notes

1. Blocking debt must be closed or formally waived (with risk acceptance) before production go-live gate.
2. High-priority debt requires tracked mitigation in Phase 2 execution checkpoints.
3. Non-blocking debt can proceed in parallel with implementation, but must be represented in CI/testing milestones.
4. Deferred enhancements are intentional and should not be pulled into Phase 2 unless blocker conditions emerge.
