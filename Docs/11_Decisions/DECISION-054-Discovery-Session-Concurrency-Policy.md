# DECISION-054 — Discovery Session Concurrency Policy

- **Status:** ✅ **Accepted (Locked).**
- **Date:** 2026-06-30
- **Context:** Resolving concurrency boundaries for continuous discovery sessions to prevent state corruption when multiple sessions overlap.

---

## Context

During a user's learning journey, multiple events can trigger dynamic discovery sessions. If multiple active discovery sessions run concurrently for the same goal, their generated signals could overlap, resulting in out-of-order state updates and dynamic roadmap corruption. A strict policy is required to manage active session limits.

---

## Decision

We establish the following concurrency policies for discovery sessions:

1. **Active Session Constraint:** At any given time, there can be at **most one** active (non-terminal) `DiscoverySession` per Learner-Goal pair.
2. **Auto-Archive Trigger:** Initiating a new `DiscoverySession` for a Learner-Goal pair will automatically archive the previous session if it is not already in a terminal state (`DISCOVERY_COMPLETE`, `EXPIRED`, `ABANDONED`).
3. **Archiving Implementation:**
   - The archive action does *not* mutate the `state` of the session.
   - It sets `archived_at = now()` (timestamp) and `superseded_by_discovery_session_id` (foreign key pointing to the new session) on the superseded session record.
   - Superseded sessions are excluded from active evaluation loops but preserved in history for audit purposes.

---

## Consequences

- **Orchestration Simplicity:** Eliminates the complexity of running parallel session evaluations and ensures sequential state machine progression.
- **History Preservation:** Adheres to the append-only principle. Historical sessions remain intact, keeping all raw answers and signals accessible for audit.
- **Recommendation Engine Integration:** The Recommendation Engine only reads the latest active or non-superseded completed session for competency analysis.

---

## Related Documents
- [DiscoveryLifecycle.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/03_Domain_Model/DiscoveryLifecycle.md)
- [DiscoveryDomain.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/03_Domain_Model/DiscoveryDomain.md)
- [DECISION-032-Immutable-Goal.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/11_Decisions/DECISION-032-Immutable-Goal.md)
