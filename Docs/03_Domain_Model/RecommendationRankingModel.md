# Recommendation Ranking Model

- **Status:** Approved Design Document
- **Domain Scope:** Recommendation Domain & Engine
- **Traceability:** DECISION-003 (Core Principle 6: No stuck learners), DECISION-019, DECISION-053

---

## 1. Prioritization Tier Matrix

When multiple recommendations are generated for a learner, the system ranks them using four prioritization tiers:

| Tier | Priority | Category | Justification |
| :--- | :---: | :--- | :--- |
| **Tier 1** | **Highest** | **Stuck & Blockers (Safety)** | Violations of Core Principle 6 ("Không để user kẹt quá lâu") require immediate resolution. Triggered by Stuck warnings or Adaptive Pause proposals. |
| **Tier 2** | **High** | **Prerequisite Regressions** | Direct gaps in mastered nodes block downstream learning paths. Must be corrected before continuing. |
| **Tier 3** | **Medium** | **Self-Assessment Mismatches** | Adjusting levels and introducing verification probes to reconcile mismatch signals (DECISION-051). |
| **Tier 4** | **Lowest** | **Path Spezialization & Expansion** | Optional path modifications, elective sub-topics, or dynamic graph expansions (DECISION-023). |

---

## 2. Quantitative Ranking Formula

To sort recommendations within tiers dynamically, the engine computes a **Recommendation Score** ($R\_Score$):

$$R\_Score = BaseWeight \times AI\_Confidence$$

### 2.1 Base Weights per Proposal Type
- `pause_session` / `stuck_intervention`: `1.0`
- `insert_node` (Regression Refresher): `0.8`
- `insert_node` (Mismatch Probe): `0.6`
- `change_mode`: `0.5`
- `insert_node` (Optional Expansion): `0.3`

### 2.2 Confidence Multiplier
The `AI_Confidence` represents the evaluator's scoring certainty (from `0.0` to `1.0`). If a regression has high confidence ($1.0$), its $R\_Score$ ($0.8$) will outrank an optional expansion even if the latter has high priority.

---

## 3. Delivery Constraints
* **Dashboard Cap:** The user interface displays a maximum of **3 active proposals** at any time.
* **Filter Rules:** Low scoring recommendations ($R\_Score < 0.20$) are filtered out and remain in the background backlog.
