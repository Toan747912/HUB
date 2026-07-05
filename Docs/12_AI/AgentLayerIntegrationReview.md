# WP-AI-04B — Agent Layer Integration Review

**Type:** Read-only architectural integration review. No production code was modified to produce this document.

**Scope:** the full chain AI Brain → Planner → Runtime → Coordinator → Message Bus → Collaboration → Learning, as it exists on disk today (`Apps/ai-backend/src`), evaluated as one integrated system rather than as isolated components.

**Relationship to prior documents:**
- `AIBrainCertification.md` — PASS (Planner Scope). Not re-litigated here; referenced at boundaries only.
- `AgentLayerCertificationPlan.md` (WP-AI-03) — defines the *future* formal certification rubric. Explicitly states no certification has been issued yet, pending Coordinator/Communication/Collaboration/Learning landing.
- `AgentLayerAuditReport.md` — 7 PASS / 1 WARNING automated static-audit output (import-graph + regex heuristics).
- `LLMUsageAudit.md` — one FAIL (legacy `AiRuntimeService` bypasses `ResilientLlmGateway`), documented and unresolved.

This review does not repeat those audits. It evaluates whether the now-complete set of layers (Coordinator, Message Bus, Collaboration, Learning — all landed since the audit report and certification plan were written) integrates cleanly with what came before, and whether the whole is ready for the WP-AI-03 certification attempt.

---

## 1. Architecture Consistency

Layering as built matches the intended order:

```
AI Brain → Planner → Runtime → Workflow → Tool Framework → Persistent Memory → Lifecycle
                                    ↓
                              Coordinator → Message Bus → Collaboration → Learning
```

Verified import directions (both research passes independently confirmed the same shape):

- `AgentLearningModule` imports nothing from any other agent-* module — it is a pure consumer of a plain value object handed to it by a caller. Cleanest-isolated layer in the system.
- `AgentCollaborationModule` imports only `AgentCoordinatorModule` + `AgentMemoryModule` — its own module doc comment states it never imports `AgentRuntimeModule`/`AgentMessageBusModule`/`AgentLifecycleModule` directly. Confirmed correct.
- `AgentCoordinatorModule` imports `AgentRuntimeModule`, `AgentMessageBusModule`, `AgentLifecycleModule`, `AgentMemoryModule`. Correct — one hop down, no skip-ahead.
- `AgentMessageBusModule` imports only `AgentRuntimeModule` — `AgentRuntimeMessageHandler` is documented as "the only class in the message bus allowed to call AgentRuntimeService" (single seam into the layer below).
- No module anywhere imports upstream (no circular dependency found across the full graph).

**One confirmed violation, but it is explicitly out of scope by prior audit, not new:** the legacy `AiRuntimeService` (`modules/ai-runtime/ai-runtime.service.ts`) still injects all five `*PlannerService`s directly and dispatches via a raw switch, bypassing `PlannerAdapterService`, the sanctioned single entry point from Agent Core into AI Brain. This is the same finding already recorded as a WARNING in `AgentLayerAuditReport.md` §2 and as known debt in `AIBrainIntegrationReview.md` §12 / `AIBrainCertification.md`. It has not been fixed since those documents were written, and `app.module.ts` still registers `AiRuntimeModule` alongside the new `AgentCoreModule` path — two independent, live routes reach the same five planners.

**Verdict: no new architectural violations. One pre-existing, pre-documented dual-path violation remains unresolved.**

---

## 2. Dependency Review

- **Compile-time:** each agent-* module's `imports` array points strictly downstream; confirmed by direct reading of all seven module files, not just grep.
- **Runtime/DI:** two DI-purity gaps found (neither is a layering violation — both stay one hop downstream, they just skip the port/interface):
  - `CoordinatorService` injects the concrete `MessageBusService` instead of the `IMessageBus` port (`coordinator.service.ts:37`).
  - `ReasoningService` (Collaboration) injects the concrete `CoordinatorService` instead of `ICoordinator` (`reasoning.service.ts:29`).
  Both interfaces exist in the codebase; they simply aren't used at the injection boundary. Low risk today (single implementation of each), but it means swapping either implementation later requires touching the consumer, not just rebinding a token.
- **Circular dependencies:** none found in either research pass, across the whole `app.module.ts` graph (32+ modules).
- **Module isolation:** `AgentLearningModule` and `AgentCollaborationModule` are the most isolated (by explicit module-comment design). `AgentMessageBusModule` and `AgentCoordinatorModule` each reach into one sibling's application service directly (`AgentSelectionService` → `AgentRegistryService`; `MessageRouterService` → `AgentRegistryService`) rather than through a narrower port — acceptable given both stay within the documented one-hop-down rule, but worth tightening if a second Runtime implementation is ever introduced.
- **`app.module.ts` ordering:** `AiRuntimeModule` (legacy) is declared before `AgentCoreModule`/`AgentToolsModule`/etc., and the four newest modules (`AgentCoordinatorModule`, `AgentCollaborationModule`, `AgentLearningModule`) are declared non-contiguously, interleaved with the five Planner modules. NestJS resolves the module graph by dependency, not array order, so this is cosmetic — but it makes the file harder to audit visually and is worth a non-functional cleanup pass.

**Verdict: PASS**, with two low-risk DI-purity notes and one cosmetic ordering note.

---

## 3. Execution Review

Traced path: **User Request → Planner → Runtime → Coordinator → Bus → Agent → Tool → Memory → Consensus → Learning.**

| Boundary | Verified behavior |
|---|---|
| Planner → Runtime | New path: `AgentRuntimeService` resolves agent/workflow via registries, executes steps through `RuntimeExecutor`. Legacy path: `AiRuntimeService` dispatches to planners via raw switch (see §1). Both are live simultaneously. |
| Runtime → Workflow | `AgentRuntimeService.run()` iterates `RuntimeStepDefinition`s sequentially, stopping at first unrecoverable failure; `ExecutionState` marks any step after a hard failure as `'skipped'` rather than silently dropping it — traceable. |
| Runtime → Tool | `ToolRegistryService.execute()` validates input against `inputSchema` before invocation; converts known failure modes (missing tool, invalid input) into `FAILURE` result objects rather than throwing; only unexpected internal throws are caught-and-converted. |
| Tool → Memory | Shared state and step/artifact data route through `MemoryStoreService`, which wraps atomic `findOneAndUpdate`+`$inc(version)` Mongo writes — single-operation atomicity confirmed at the storage layer. |
| Runtime/Coordinator → Lifecycle | Both `AgentRuntimeService` and `CoordinatorService` create a lifecycle instance before executing (confirmed independently, matches `AgentLayerAuditReport.md` §5). Lifecycle calls from both callers are best-effort (`.catch(() => undefined)`) — a lifecycle-write failure never blocks the caller's own result reporting, but also means lifecycle state can silently drift from actual execution state under a lifecycle-service outage. |
| Coordinator → Bus | `CoordinatorService` publishes through `MessageBusService`; message delivery outcome is read off the returned message's `status`/`lastError`, never a rejected promise. |
| Bus → Agent | `AgentRuntimeMessageHandler` is the sole caller of `AgentRuntimeService` from the bus side — single seam confirmed. |
| Coordinator → Collaboration → Consensus | `CollaborationService.collaborate()` drives `ReasoningService` (per-role steps) → `ConsensusService` (Majority only) → `SynthesisService`; unresolved majority triggers a Critic→Reviewer conflict-resolution path rather than failing outright. |
| → Learning | **No confirmed live caller.** Both agents independently note that nothing in Coordinator, Collaboration, or Runtime currently invokes `LearningService.runCycle()` on completion. Learning is implemented as "a pure consumer of a plain `CompletedExecutionInput` value" but no producer of that value was found wired to it in `app.module.ts` or any completion handler. **This is the single largest execution-path gap in the system: the traced chain does not currently close the loop back into Learning from real executions.**

**Verdict: CONDITIONAL — every boundary except the last is traceable and behaves as documented. The Coordinator/Collaboration → Learning handoff appears to be an unwired seam, not an implemented integration.** This should be confirmed or refuted before certification (a false negative here — a caller existing elsewhere in the codebase, e.g. a cron/queue consumer not covered by either research pass — is possible and should be checked directly rather than assumed).

---

## 4. Failure Review

Failure-handling maturity is uneven across the four newest layers, ranked most to least robust:

1. **Message Bus** — most robust. `MessageDispatcherService` retries up to `MAX_RETRIES = 3` before routing to `DEAD_LETTER`; `onModuleInit()` recovers in-flight (`QUEUED`/`DELIVERING`/`RETRYING`) messages after a crash. Gap: messages still in `CREATED` status at crash time are **not** included in the recovery query, so they are never recovered on restart.
2. **Coordinator** — `coordinate()` never rejects; internal errors become a `failure`-status `CoordinationResult`. A failed *mandatory* agent halts remaining sequential execution (by design). Only `Sequential` execution policy is implemented; `Parallel`/`FirstSuccess`/`MajorityVote`/`Pipeline` throw `STRATEGY_NOT_IMPLEMENTED` if selected — documented, intentional phased rollout, not a silent gap.
3. **Collaboration** — same never-reject contract as Coordinator; only `Majority` consensus is implemented, others return an explicit `not_implemented` result rather than throwing. Documented, intentional.
4. **Learning** — weakest. `runCycle()` logs and audits the failure but then **re-throws the raw error** to the caller. No retry, no dead-letter, no partial-success handling. Since nothing currently calls `runCycle()` from a real execution path (see §3), this gap has not yet been exercised in production but should be hardened before the loop is closed.

Runtime/Tool/Memory/Lifecycle (audited in the prior WP-AI-04A pass, re-confirmed here):
- `BasePlannerService.execute()` re-throws on unrecoverable failure after emitting observability — correct fail-loud behavior for a planner-tier component.
- `ToolRegistryService.execute()` converts known failure modes to result objects; only unexpected throws are caught.
- `MemoryStoreService.run()` re-throws after emitting observability (not swallowed).
- `LifecycleService` has no try/catch of its own — errors from `registry.transition()` propagate raw to the caller, who is expected to handle them (and does, via `.catch()` in both Runtime and Coordinator).

**Verdict: PASS for graceful degradation where implemented, with one real gap** — Learning's raw re-throw with no caller-side handling yet designed for it — **and the caveat that "not implemented" strategies (4/5 coordinator policies, 3/4 consensus strategies) are correctly fail-loud rather than silently wrong, which is the right choice for a phased rollout but should be tracked as debt, not treated as complete.**

---

## 5. Observability Review

Cross-referencing both research passes against `AgentLayerAuditReport.md` §8 (which already scored 9/9 modules PASS for "emits metrics, structured logs, and audit events"):

- Confirmed at the call-site level for every layer: `structuredLogger.log(...)`, a `metrics.record*Outcome(...)` call, and a fire-and-forget `auditLog.recordSecurityEvent(...).catch(() => undefined)` triple.
- One inconsistency found that the static audit would not catch (it checks for *presence* of logging, not *which* logger): `LifecycleService` uses Nest's built-in `Logger` (`new Logger(LifecycleService.name)`) instead of the shared `StructuredLoggerService` used by every other agent-* module. Functionally fine (it still logs), but it means Lifecycle's log output does not carry the same structured schema/correlation fields as the rest of the layer, weakening cross-layer trace correlation for exactly the layer most responsible for crash recovery.
- One structural inconsistency in Learning: rather than adding a `recordLearningOutcome`-style method to the shared `metrics.service.ts` (the pattern every other layer follows), `LearningService` registers its own Prometheus metrics directly onto `MetricsService.registry` (`learning_total`, `experience_total`, `pattern_total`, `knowledge_total`, `recommendation_total`, `learning_duration_ms`). This works and is scraped correctly, but it means the metrics surface for Learning is discoverable only by reading `learning.service.ts`, not by reading the shared metrics service — an inconsistent pattern going forward.

**Verdict: PASS.** Coverage is complete across all layers; the two findings above are consistency/discoverability nits, not gaps.

---

## 6. Persistence Review

| Layer | Store | Atomicity |
|---|---|---|
| Memory | Mongo, `findOneAndUpdate` + `$inc(version)`, upsert | Single atomic op — good. |
| Lifecycle | Mongo, `findOneAndUpdate` | Single atomic op — good. |
| Message Bus | Mongo `agent_messages` | **Not atomic**: `publish()` performs `store.create()` then a separate `store.updateStatus(..., QUEUED)` — two writes, no transaction. A crash between them leaves a message permanently stuck in `CREATED`, since restart recovery only re-dispatches `QUEUED`/`DELIVERING`/`RETRYING`. |
| Coordinator | None dedicated — in-memory `Map<planId, CoordinationPlan>` in `CoordinatorRegistryService`, never evicted, lost on restart, no recovery-on-restart logic (unlike Message Bus). Shared cross-agent output is written to `MemoryStoreService` separately from the message-bus publish that produced it — two independent systems, no cross-system transaction. |
| Collaboration | In-memory `Map<sessionId, CollaborationSession>` in `CollaborationService`, same unbounded/no-eviction/lost-on-restart pattern as Coordinator. Per-step and per-artifact data is written incrementally to `MemoryStoreService`, but the aggregate session record (with consensus/final result) is only durably persisted after the *entire* run completes — a mid-run crash leaves orphaned step/artifact memory records with no session record tying them together, and no cleanup path for the orphans. |
| Learning | Mongo, 4 collections (`learning_records`, `execution_patterns`, `knowledge_items`, `recommendations`) | **Not atomic**: `runCycle()` writes patterns → knowledge items → recommendations → the learning record as four separate, non-transactional writes. The `LearningRecord` (saved last) is the only place that cross-references pattern/knowledge/recommendation IDs — a failure after any earlier write leaves orphans with no back-reference recorded anywhere. No compensating rollback. |

This is the same *class* of gap already known and accepted for the domain layer (`ai-backend non-atomic outbox` — domain write + outbox write are not transactional), so it is a repeated pattern in this codebase rather than a new discovery, but it now appears in three additional places (Message Bus, Learning, and implicitly Coordinator/Memory cross-system writes).

**Repository pattern:** consistently applied — every layer with real persistence goes through a repository interface bound via a DI token (`MEMORY_REPOSITORY`, `MESSAGE_REPOSITORY`, `LEARNING_REPOSITORY`), confirmed by the Memory Audit (`AgentLayerAuditReport.md` §4) and independently re-verified for Message Bus and Learning here.

**Verdict: CONDITIONAL PASS.** No data corruption risk found (all failure modes leave orphaned/stuck records, not corrupted ones), but three non-atomic multi-write sequences and two unbounded, non-recoverable in-memory registries are real operational risk that should be enumerated as conditions, not silently accepted.

---

## 7. Scalability Review

**Single instance today, but several structures will not survive multi-instance or long-running-process growth:**

- `CoordinatorRegistryService.plans` — unbounded in-memory `Map`, no TTL/eviction, single-process only (a second Coordinator instance would not see another instance's plans).
- `CollaborationService.sessions` — same pattern, same risk.
- `MessageRouterService.subscribers` — in-memory `Map`, no size bound beyond explicit `unsubscribe()`.
- `MongoMessageRepository.findByStatus`/`findByTraceId` — **no `.limit()`/pagination**; `onModuleInit()` crash-recovery runs this as a full unbounded query against all in-flight messages at once. At small scale this is fine; at high message volume this becomes a full-collection scan on every process restart.
- **No TTL index on any of the four collections that should have one**: `agent_messages`, `learning_records`, `execution_patterns`, `knowledge_items`, `recommendations` all grow forever with no purge path. (Memory has a lazy-expiry + active-GC-sweep pattern instead of a Mongo TTL index, which is at least a deliberate design — the others simply have no expiry mechanism at all.)
- **Learning is comparatively better-behaved**: its read methods (`listRecentLearningRecords`, `findKnowledgeItems`, `findRecommendations`) all pass explicit `.limit()` (default 100, or a caller-supplied `historyLimit` default 50) — the only layer with bounded reads by default.

**Future bottlenecks, in likely order of impact:** (1) unbounded Mongo collection growth with no TTL/archival strategy across Message Bus and Learning, (2) in-memory Coordinator/Collaboration registries preventing horizontal scaling of those two services beyond a single instance, (3) unbounded message-status queries on every restart as message volume grows.

**Verdict: CONDITIONAL — fine at current scale, but multi-instance Coordinator/Collaboration and long-running Message Bus/Learning collections are not yet designed for growth.**

---

## 8. Extensibility Review

| Extension point | Effort without refactoring |
|---|---|
| New planner | Low — extend `BasePlannerService`, wire through `PlannerAdapterService`. Confirmed pattern by 5/5 existing planners passing `PlannerContractReport.md` (35/35 checks). |
| New tool | Low — implement `IAgentTool`, register with `ToolRegistryService.register()`; duplicate-ID collision is the only guard. |
| New agent | Low-medium — defined via `AgentRegistryService`/agent definition + workflow; no code change needed in Runtime itself if the workflow uses existing step types. |
| New workflow | Low — new `RuntimeStepDefinition` sequence; executor is generic over step definitions. |
| New role | Low — `RoleResolverService` binds roles to agent IDs via a `Map`; adding a role is a data change, not a code change, though the round-robin-only selection (no health/load awareness) is explicitly flagged in its own doc comment as remaining work. |
| New consensus strategy | Medium — `ConsensusService` already has a strategy-dispatch shape (`Majority` implemented, 3 others stubbed as `not_implemented`); adding one means implementing an existing stub, not restructuring. |
| New execution/coordination policy | Medium — same shape as consensus: `NotImplementedStrategy` stubs already exist for `Parallel`/`FirstSuccess`/`MajorityVote`/`Pipeline`; implementing one is additive. |
| New learning algorithm | Medium — `PatternDetectorService`/`RecommendationEngineService` are the extension seams; no interface abstraction was found separating "a" pattern-detection algorithm from "the" implementation, so a second algorithm alongside the first would likely require internal restructuring rather than pure addition. |

**Verdict: PASS.** The system was deliberately built with additive seams (tool registry, planner adapter, strategy stubs) rather than closed switch statements, with the partial exception of Learning's pattern/recommendation internals, which are extension-*possible* but not yet extension-*designed*.

---

## 9. Technical Debt

**Known Debt (already documented elsewhere, reconfirmed live in code):**
- Legacy `AiRuntimeService` bypasses `PlannerAdapterService` and calls planners directly (`AgentLayerAuditReport.md` §2, `AIBrainCertification.md`).
- Legacy `AiRuntimeService` calls `MockLlmClientService` directly, bypassing `ResilientLlmGateway`/circuit breaker (`LLMUsageAudit.md` — FAIL, unresolved).
- `ai-backend non-atomic outbox` — domain write + outbox write are not transactional (pre-existing, see memory).

**Newly identified in this review:**
- Message Bus `publish()` two-write non-atomicity; `CREATED`-status messages unrecoverable on restart.
- Learning `runCycle()` four-write non-atomicity with no compensating rollback and no back-reference recorded until the final write.
- `CoordinatorRegistryService` and `CollaborationService` in-memory registries: unbounded growth, no eviction, lost on restart, no recovery-on-restart (unlike Message Bus).
- No caller currently wires Coordinator/Collaboration completion into `LearningService.runCycle()` — the learning loop is implemented but not confirmed closed (see §3; needs direct confirmation, not assumed absent).
- Two DI-purity gaps: Coordinator→concrete `MessageBusService`, Reasoning→concrete `CoordinatorService`, instead of their respective ports.
- `LifecycleService` uses Nest's built-in `Logger` instead of `StructuredLoggerService`, breaking structured-log consistency for the layer most responsible for crash recovery.
- Learning registers metrics directly on the Prometheus registry rather than through `metrics.service.ts`'s existing pattern.
- No TTL index/purge mechanism on `agent_messages`, `learning_records`, `execution_patterns`, `knowledge_items`, `recommendations`.
- No `.limit()`/pagination on `MongoMessageRepository.findByStatus`/`findByTraceId`.

**Deferred Work (explicitly documented as intentional, phased, not accidental):**
- Coordinator: only `Sequential` execution policy implemented; `Parallel`/`FirstSuccess`/`MajorityVote`/`Pipeline` are stubs.
- Collaboration: only `Majority` consensus implemented; `Weighted`/`Unanimous`/`Confidence` are stubs.
- `RoleResolverService`: round-robin only, no health/load-aware selection (flagged in its own doc comment).

**Out-of-Scope Debt:** confidence-scale duplication across 5+ planner-adjacent locations (`normalizeConfidence` reimplemented independently in legacy `AiRuntimeService`) — tracked in `ConfidenceStandardization.md`, out of this review's scope but adjacent to the dual-runtime-path issue.

**Legacy Components:** `modules/ai-runtime/` (legacy runtime + `AiRuntimeService`) is fully superseded in design intent by `modules/agent-runtime/` + `PlannerAdapterService`, but remains registered in `app.module.ts` and live. No deprecation timeline exists in any reviewed document.

---

## 10. Overall Assessment

| Dimension | Score (1–10) | Basis |
|---|---|---|
| Architecture | 8 | Clean layering, no new violations; one pre-existing dual-path issue carried forward. |
| Maintainability | 7 | Consistent patterns (repository DI tokens, observability triple) with a few inconsistencies (Lifecycle's logger choice, Learning's metrics registration, two DI-purity gaps). |
| Extensibility | 8 | Deliberate additive seams (tool registry, strategy stubs, planner adapter) throughout. |
| Reliability | 6 | Uneven failure-handling maturity (Message Bus strong → Learning weak); three non-atomic multi-write sequences; two unbounded, non-recoverable in-memory registries; unclosed Learning feedback loop. |
| Observability | 9 | Complete coverage across every layer per both this review and the prior automated audit; only minor consistency nits. |
| Readiness (for WP-AI-03 certification) | 6 | Structurally sound but several Section-2 requirements from `AgentLayerCertificationPlan.md` are not yet demonstrably met: Recovery (§Req 10) is incomplete for Message Bus `CREATED`-state and for Coordinator/Collaboration restart; Shared memory race-safety (§Req 11) was not verified under concurrency by this review (no stress test evidence exists yet, consistent with `AgentLayerCertificationPlan.md` §4 still requiring it); Communication (§Req 12) reliability has a known gap (unatomic publish). |
| **Overall** | **7 / 10** | System is architecturally sound and ready for hardening, not yet ready for a clean PASS certification. |

### Recommendations

1. **Confirm or wire the Learning feedback loop.** Before treating Learning as integrated (not just implemented), verify whether any real caller invokes `LearningService.runCycle()` on Coordinator/Collaboration completion. If none exists, this is the single highest-priority integration gap.
2. **Fix Message Bus `CREATED`-state recovery** so a crash between `create()` and the `QUEUED` status update doesn't strand a message permanently.
3. **Add a persisted, recoverable backing store (or explicit acceptance-of-risk note) for `CoordinatorRegistryService` and `CollaborationService`'s in-memory registries** before any multi-instance deployment is considered, and add TTL/eviction regardless.
4. **Add TTL/archival policy for `agent_messages`, `learning_records`, `execution_patterns`, `knowledge_items`, `recommendations`.**
5. **Harden Learning's failure path** (currently raw re-throw) before it has a real caller, so a learning-cycle failure can't take down whatever eventually triggers it.
6. **Retire or explicitly re-scope `AiRuntimeService`** — it has been flagged as bypassing both the planner adapter and the resilient LLM gateway in three separate documents now; a decision (sunset date, or explicit "kept intentionally, here's why") is overdue.
7. Minor cleanups: route `LifecycleService` through `StructuredLoggerService`; register Learning's metrics through `metrics.service.ts`'s existing pattern; bind Coordinator/Collaboration to `IMessageBus`/`ICoordinator` ports instead of concrete classes.

### Certification Recommendation

**CONDITIONAL PASS.**

The Agent Layer, taken as a whole, is architecturally coherent, fully observable, and free of new circular-dependency or layering violations. It is not ready for an unconditional PASS under the `AgentLayerCertificationPlan.md` rubric: Recovery (Req 10) and Shared-memory race-safety (Req 11) are not yet demonstrated with evidence (stress tests are still outstanding per that plan's own Section 4), and this review surfaced three non-atomic persistence sequences and an unconfirmed Learning integration seam that should be resolved or explicitly accepted as scoped conditions — following the same precedent `AIBrainCertification.md` used for its own Known Technical Debt section — before a formal PASS is issued.

None of the findings in this review are FAIL-level (no data corruption, no circular dependencies, no missing observability); they are conditions to enumerate and either fix or explicitly accept, consistent with the CONDITIONAL PASS definition in `AgentLayerCertificationPlan.md` §5.
