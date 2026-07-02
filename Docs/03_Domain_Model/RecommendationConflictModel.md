# Recommendation Conflict Model

- **Status:** Approved Design Document
- **Domain Scope:** Recommendation Domain & Engine
- **Traceability:** DECISION-019 (Independent capability), DECISION-006 (Roadmap Governance)

---

## 1. Conflict Prevention Rules

To prevent contradictory or overwhelming advice, the engine filters proposals through a set of logical conflict matrices before displaying them:

### 1.1 Regression vs. Skip Conflict
* **Scenario:** Learner has a regression on Node A, but the AI also proposes skipping Node B (which is a descendant/dependency of Node A).
* **Rule:** **Regression Wins.** The skip proposal is automatically marked as `Superseded`. You cannot skip a node when its parent prerequisite is unmastered.

### 1.2 Multi-Mode Conflict
* **Scenario:** Dynamic session feedback prompts one service to recommend Mode A (Standard) and another to recommend Mode B (Supportive/Ladder) for the same node.
* **Rule:** **Supportive Wins.** The system overrides standard recommendations in favor of supportive learning modes to prevent user fatigue and sticking (Principle 6).

### 1.3 State Blocker Conflict
* **Scenario:** The learner's onboarding discovery session is in state `BLOCKED` or `INIT`, but the recommendation engine generates goal path proposals.
* **Rule:** **Blocker Wins.** All roadmap-related recommendations are suppressed on the client while a session-level blocker is active.

---

## 2. Cognitive Overload Constraints

To maintain clean, goal-oriented pathways:

* **Max Active Limit:** No more than **one** `insert_node` proposal can be active for a single goal path simultaneously.
* **Proximity Rule:** The engine only recommends inserting nodes that are immediate neighbors (depth gap = 1) of already mastered nodes. We do not propose inserting topics that are 3 levels deep in the prerequisite tree before the parent nodes are resolved.
