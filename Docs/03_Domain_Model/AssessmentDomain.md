# Assessment Domain Model

- **Status:** Approved Design Document
- **Domain Scope:** Assessment Domain & Engine
- **Traceability:** DECISION-026 (Assessment independent core domain), DECISION-030 (AssessmentResult structure)

---

## 1. Domain Entities & Value Objects

The Assessment Domain acts as the sole judge of learner competence. It translates user evidences into verified mastery snapshots.

### 1.1 `AssessmentResult` (Aggregate Root)
The primary historic record of a single evaluation. It is immutable (append-only) to preserve audit trails.
* **Attributes:**
  - `assessment_result_id`: UUID (Primary Key)
  - `learner_id`: UUID (FK to Learner)
  - `knowledge_node_id`: UUID (FK to KnowledgeNode)
  - `assessed_level`: Enum (`Remember` | `Explain` | `Apply` | `Teach`)
  - `score_details`: JSON (Mapping of sub-capabilities if evaluated at Teach level)
  - `confidence`: Decimal (0.0 to 1.0)
  - `reasoning`: String (AI-generated explanation text)
  - **Audit Fields:** `created_at`, `created_by_actor_type`, `created_by_actor_id`.

### 1.2 `AssessmentProfile` (Entity)
A calculated projection summarizing the historical mastery results across all nodes for a specific learner.
* **Attributes:**
  - `learner_id`: UUID (Primary Key)
  - `overall_confidence`: Decimal (Aggregate score)
  - `updated_at`: DateTimeOffset

---

## 2. Write-Ownership & Boundaries

As locked by DECISION-026, the Assessment Domain has strictly defined write boundaries:

* **Write Owner of `mastery_record`:** Only the Assessment service has permission to create or update `dbo.mastery_record` rows. Other engines (such as Roadmap, Recommendation, or Teaching) must only read mastery snapshots.
* **Consumes Evidence & Teaching Outcomes:** The Assessment Domain subscribes to `EvidenceAdded` and teaching completion events, evaluating them to produce new `AssessmentResult` records.
* **Explainability Enforcer:** Every created `AssessmentResult` is registered with the `Explainability` trace-link model, binding it directly to the source `Evidence` records.

---

## 3. Domain Events

* **`AssessmentResultCreated`**
  - *Description:* Emitted when a new evaluation is successfully committed.
  - *Payload:* `{ assessment_result_id: UUID, learner_id: UUID, knowledge_node_id: UUID, assessed_level: String, confidence: Decimal }`

* **`MasteryLevelUpgraded`**
  - *Description:* Emitted when an assessment result causes a learner's `mastery_record.mastery_level` to increase.
  - *Payload:* `{ learner_id: UUID, knowledge_node_id: UUID, old_level: String, new_level: String }`

* **`KnowledgeRegressionDetected`**
  - *Description:* Emitted when the cumulative negative weight of evidence triggers a demotion in mastery level (DECISION-021/053).
  - *Payload:* `{ learner_id: UUID, knowledge_node_id: UUID, old_level: String, new_level: String, cumulative_negative_weight: Decimal }`
