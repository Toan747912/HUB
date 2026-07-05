# WP-AI-03 — Agent Layer Certification Plan

**Status: PLANNING DOCUMENT ONLY. No certification has been issued. Nothing in this document is a PASS, CONDITIONAL PASS, or FAIL claim about current code.**

**Purpose:** define, in advance, the scope, requirements, audits, evidence, and exit criteria that will govern the Agent Layer certification once WP-AI-03 is complete. This lets certification be planned against a stable rubric instead of being improvised after the fact, and lets partially-built modules be reviewed against a known bar as they land.

**Written against:** WP-AI-03 in-progress state, 2026-07-04. Completed: ADR, Contracts, Runtime, Tool Framework, Persistent Memory, Lifecycle Manager. Remaining: Multi-Agent Coordinator, Agent Communication, Agent Collaboration, Learning Integration.

---

## 1. Certification Scope

The future Agent Layer certification will cover **only**:

- **Agent Runtime** (`Apps/ai-backend/src/modules/agent-runtime/`)
- **Workflow Engine** (workflow/execution-graph logic within Agent Runtime)
- **Planner Adapter** (the boundary contract between the Agent Layer and the existing AI Brain planners — not the planners themselves)
- **Tool Framework** (`Apps/ai-backend/src/modules/agent-tools/`)
- **Memory Framework** (`Apps/ai-backend/src/modules/agent-memory/`)
- **Lifecycle Manager** (`Apps/ai-backend/src/modules/agent-lifecycle/`)
- **Multi-Agent Coordinator** (`Apps/ai-backend/src/modules/agent-coordinator/`, not yet built)
- **Communication Layer** (inter-agent messaging, not yet built)
- **Collaboration Layer** (multi-agent task-sharing/negotiation, not yet built)

**Explicitly excluded from this certification** (out of scope regardless of their own state):

- **AI Brain certification** — covered by `AIBrainCertification.md` (WP-AI-02). The Agent Layer certification will not re-certify or re-litigate planner internals.
- **Planner certification** — the five planners (Mission, Discovery, Knowledge, Evidence, Teaching) and `BasePlannerService` are certified separately. The Agent Layer certification touches them only at the Planner Adapter boundary.
- **Infrastructure** — deployment, containers, environment config.
- **Database** — schema, migrations, query correctness outside of what Memory Framework persistence directly requires.
- **Authentication** — auth/session/authorization mechanisms.

Any finding, pass, or fail in the eventual certification document applies only to the in-scope list above. If an out-of-scope dependency is implicated by an in-scope finding, it must be named explicitly as a boundary note, not folded into the certification verdict.

## 2. Certification Requirements

Every item below is mandatory. The eventual certification cannot reach PASS while any is unmet.

| # | Requirement | Description |
|---|---|---|
| 1 | **Runtime correctness** | Agent Runtime executes agent definitions/workflows deterministically for a given input and tool/LLM response sequence; no unhandled state transitions. |
| 2 | **Workflow correctness** | Workflow Engine executes steps in declared order/dependency graph; branching, retries, and termination conditions behave as specified; no silent step-skipping. |
| 3 | **Lifecycle correctness** | Lifecycle Manager enforces valid state transitions only (e.g., created → running → paused/completed/failed); no agent can be invoked outside a valid lifecycle state. |
| 4 | **Memory persistence** | Agent Memory Framework persists and retrieves state across process restarts for any agent that declares persistent memory; no silent data loss on crash-and-restart. |
| 5 | **Planner isolation** | Agent Layer calls planners only through the Planner Adapter boundary; no agent module bypasses the adapter to call planner internals or the LLM gateway directly. |
| 6 | **Tool isolation** | Each tool executes in a bounded, declared permission/capability scope; no tool can access resources or perform actions outside its declared contract. |
| 7 | **Observability** | Every agent execution, tool call, lifecycle transition, and coordinator/communication event emits a structured log entry via the existing `StructuredLoggerService` (or its Agent Layer equivalent) — no raw `console.log`. |
| 8 | **Audit** | Every security-relevant or state-mutating agent action (tool invocation, memory write, lifecycle transition, inter-agent message) emits an audit event. |
| 9 | **Metrics** | Agent execution count/success/failure/latency, tool invocation count/failure, lifecycle transition count, and coordinator/communication throughput are exposed as metrics. |
| 10 | **Recovery** | An agent, tool call, or coordinated multi-agent task that fails mid-execution can be resumed, retried, or safely aborted without corrupting shared state. |
| 11 | **Shared memory** | Where multiple agents read/write shared memory, concurrent access is race-safe (no lost updates, no torn reads) and access is scoped to authorized agents only. |
| 12 | **Communication** | Inter-agent messages are delivered reliably (or failure is surfaced, not swallowed) and are typed/validated against a declared contract. |
| 13 | **Collaboration** | Multi-agent task handoff/negotiation preserves task state and ownership; no task can be silently dropped or duplicated across agents. |

## 3. Mandatory Audits

Each audit below must exist as a repeatable, scripted tool (following the precedent of `planner-contract-audit.ts`) and must pass before certification is granted.

| Audit | Verifies |
|---|---|
| **Runtime Contract Audit** | Agent Runtime conforms to its declared execution contract: valid input/output shapes, deterministic dispatch, no direct LLM/planner calls outside the adapter. |
| **Workflow Audit** | Workflow Engine step graphs execute in declared order; all branch/retry/termination paths are reachable and tested. |
| **Tool Contract Audit** | Every registered tool declares and enforces its permission scope; no tool exceeds its declared capability. |
| **Memory Audit** | Memory Framework persists correctly across restart; shared-memory access is scoped and race-safe. |
| **Lifecycle Audit** | Lifecycle Manager only permits declared state transitions; no orphaned or stuck agent states. |
| **Coordinator Audit** | Multi-Agent Coordinator assigns/tracks tasks without duplication or silent drop; recovers cleanly from a participant agent failure. |
| **Communication Audit** | Inter-agent messages are typed, validated, and delivery failures are surfaced (not swallowed). |
| **Recovery Audit** | Simulated mid-execution failures (agent crash, tool timeout, coordinator restart) resume/retry/abort cleanly with no state corruption. |

## 4. Required Evidence

The following evidence must be produced and attached to the certification document before a verdict is issued:

- **Build** — clean production build, zero errors.
- **Typecheck** — `npm run typecheck`, zero errors.
- **Test count** — full unit test suite pass count (suites/tests), no skipped tests in-scope.
- **Coverage** — coverage numbers for all in-scope modules (Agent Runtime, Workflow Engine, Planner Adapter, Tool Framework, Memory Framework, Lifecycle Manager, Coordinator, Communication, Collaboration).
- **Integration tests** — cross-module tests exercising at least one full multi-agent workflow (runtime → tools → memory → lifecycle → coordinator → communication).
- **Stress tests** — concurrent multi-agent load (parallel agents sharing memory/coordinator) with no race/corruption observed.
- **Audit reports** — output of all 8 mandatory audits from Section 3, each with a pass/fail count.
- **Architecture review** — a written review confirming the built system matches ADR-061 (or its successor) with no undocumented deviation.

## 5. Certification Levels

- **FAIL** — one or more mandatory requirements (Section 2) unmet, or one or more mandatory audits (Section 3) fail, or required evidence (Section 4) is missing.
- **CONDITIONAL PASS** — all mandatory audits pass and all mandatory evidence is present, but one or more findings are documented as known, scoped technical debt that does not block core correctness (following the precedent set in `AIBrainCertification.md`'s Known Technical Debt section). Conditions must be explicitly enumerated with a remediation owner/timeline.
- **PASS (Agent Layer)** — all mandatory requirements met, all mandatory audits pass with no open conditions, all required evidence attached, and no known technical debt within the certification scope.

## 6. Exit Criteria

Certification may only be attempted once **all** of the following are objectively true:

1. All four remaining WP-AI-03 components (Multi-Agent Coordinator, Agent Communication, Agent Collaboration, Learning Integration) are implemented and merged.
2. All 13 requirements in Section 2 have corresponding implemented behavior (not stubbed/mocked) in the codebase.
3. All 8 audits in Section 3 exist as runnable scripts under `Apps/ai-backend/scripts/` and produce a checked-in report under `Docs/12_AI/`.
4. All required evidence in Section 4 has been generated against the final WP-AI-03 codebase state (not a prior snapshot).
5. Zero unresolved FAIL-level findings within the certification scope defined in Section 1.
6. Any CONDITIONAL PASS candidate has each condition documented with an explicit boundary statement (why it doesn't invalidate the rest of the certification) and a named follow-up work package, per the precedent in `AIBrainCertification.md`.

Until all six are met, no certification verdict may be issued for the Agent Layer.

---

## This Document's Status

This is a **plan only**. It defines the rubric the future certification will be measured against. **No certification has been issued, attempted, or implied by this document.** The remaining WP-AI-03 work (Multi-Agent Coordinator, Agent Communication, Agent Collaboration, Learning Integration) must land first, per Section 6.
