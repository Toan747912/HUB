# Recommendation Domain Model

- **Status:** Approved Design Document
- **Domain Scope:** Recommendation Domain & Engine
- **Traceability:** DECISION-019 (Recommendation independent capability), DECISION-027 (Explainability First)

---

## 1. Domain Entities & Value Objects

The Recommendation Domain operates as an advisor. It aggregates system triggers and offers them to the learner as actionable items.

### 1.1 `RecommendationProposal` (Aggregate Root)
A single recommendation proposal offered to the learner.
* **Attributes:**
  - `recommendation_proposal_id`: UUID (Primary Key)
  - `learner_id`: UUID (FK to Learner)
  - `goal_id`: UUID (FK to Goal)
  - `proposal_type`: Enum (`insert_node` | `skip_node` | `pause_session` | `change_mode`)
  - `payload_details`: JSON (Action parameters, e.g. target `knowledge_node_id`, proposed `learning_mode`)
  - `status`: Enum (`proposed` | `accepted` | `rejected` | `expired` | `superseded`)
  - `confidence`: Decimal (0.0 to 1.0)
  - `reasoning`: String (AI-generated explanation text)
  - **Audit Fields:** `created_at`, `created_by_actor_type`, `created_by_actor_id`, `updated_at`, `updated_by_actor_type`, `updated_by_actor_id`.

---

## 2. Proposal-Only Boundaries & Enforcements

To preserve learner control and database modularity:

* **Proposal-Only (DECISION-019):** The Recommendation Engine cannot modify, insert, or delete any record in `dbo.goal`, `dbo.roadmap_node`, `dbo.learning_session`, or `dbo.knowledge_node` tables.
* **Learner Governance (DECISION-006):** Recommending a change (e.g. adding a node due to a prerequisite gap) does not mutate the active roadmap. The change is executed by the Roadmap Domain **only** after the learner triggers an API call accepting the proposal.
* **Explainability Audit:** Every proposal must link to the source triggers (regression, mismatch) via the `TraceLink` model (`traced_to` references, DECISION-027).

---

## 3. Domain Events

* **`RecommendationProposed`**
  - *Description:* Emitted when a new proposal is created.
  - *Payload:* `{ recommendation_proposal_id: UUID, learner_id: UUID, proposal_type: String, confidence: Decimal }`

* **`RecommendationAccepted`**
  - *Description:* Emitted when a learner approves a proposal (triggers the corresponding roadmap modification).
  - *Payload:* `{ recommendation_proposal_id: UUID, learner_id: UUID, proposal_type: String }`

* **`RecommendationRejected`**
  - *Description:* Emitted when a learner rejects a proposal.
  - *Payload:* `{ recommendation_proposal_id: UUID, learner_id: UUID, rejection_reason: String }`
