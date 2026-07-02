# Discovery State Machine

- **Status:** ⚠️ **Superseded.**
- **Authoritative Source:** The state descriptions, transition diagrams, and terminal states are now officially governed by [DiscoveryLifecycle.md](DiscoveryLifecycle.md) (complying with DECISION-051, 054).

---

## 1. States & Transitions
Sections 1, 2, and 3 of the original State Machine draft (which assumed no Pause/Abandon) are superseded by:
* [DiscoveryLifecycle.md](DiscoveryLifecycle.md) (State Table and Transition Diagram supporting `INIT`, `DISCOVERY`, `DISCOVERY_COMPLETE`, `BLOCKED`, `EXPIRED`, `ABANDONED`).
* [DECISION-051-Self-Assessment-Mismatch-Mechanism.md](../11_Decisions/DECISION-051-Self-Assessment-Mismatch-Mechanism.md) (Mismatch logic).
* [DECISION-054-Discovery-Session-Concurrency-Policy.md](../11_Decisions/DECISION-054-Discovery-Session-Concurrency-Policy.md) (Concurrency rules using `archived_at` and `superseded_by_discovery_session_id`).

---

## 2. Relation to Capability #8 (Continuous Discovery)
*Continuous Discovery* does **not** resume a `DiscoverySession` that has reached the `DISCOVERY_COMPLETE` state. 
- It always creates a **new `DiscoverySession`** with `trigger = 'continuous'` (as defined in [DiscoveryDomain.md](DiscoveryDomain.md)).
- The state model of the new session is independent, starting fresh from `INIT`.
- To prevent database state corruption, starting a new continuous session automatically archives any existing active session under the Learner-Goal pair (locked by DECISION-054).

---

## 3. Execution Boundary (Chặn state 'ROADMAP')
The constraint preventing the state machine from entering a `ROADMAP` state is enforced at two separate layers:
1. **Database Layer:** The `state` enum column only permits the 6 closed lifecycle values defined in `DiscoveryLifecycle.md`.
2. **Application Layer:** The Roadmap Engine (outside Phase 1) actively pulls session data once a session has reached `DISCOVERY_COMPLETE`. The Discovery Engine never pushes or triggers the transition to the Roadmap Engine directly, preserving the strict isolation of capabilities (DECISION-007, DECISION-019).
