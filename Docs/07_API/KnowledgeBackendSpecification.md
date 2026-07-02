# Knowledge Backend Specification

- **Phase:** Phase 1 — Knowledge Engine (Backend Design)
- **Status:** Approved Architecture Draft
- **Authority:** This document defines the backend command/query contracts, service layers, repositories, state-machine transitions, and explainability behaviors for the Knowledge Engine, compliant with decisions DECISION-015 to DECISION-033 and DECISION-042 to DECISION-055.

---

## 1. Command Model (Write Operations)

### 1.1 `CreateKnowledgeNodeCommand`
* **Input Parameters:**
  ```json
  {
    "title": "String (Required, Unique)",
    "description": "String (Required)",
    "status": "String ('draft' | 'local' | 'structural') (Required)",
    "actor_type": "String",
    "actor_id": "UUID (Nullable)"
  }
  ```
* **Validation Rules:**
  - `title` must be non-empty and trimmed (Max 255). Must be unique in `dbo.knowledge_node`.
  - `status` must match one of the defined lifecycle values.
* **State Preconditions:** None.
* **Side Effects:**
  - Inserts a new `knowledge_node` record.
* **Events Produced:** `KnowledgeNodeCreated { knowledge_node_id, title }`

### 1.2 `CreateKnowledgeRelationCommand`
* **Input Parameters:**
  ```json
  {
    "from_knowledge_node_id": "UUID (Required)",
    "to_knowledge_node_id": "UUID (Required)",
    "relation_type": "String ('prerequisite_of' | 'expands_to' | 'related_to') (Required)"
  }
  ```
* **Validation Rules:**
  - Both IDs must be valid UUIDs and cannot be equal (Self-reference constraint: `from_knowledge_node_id <> to_knowledge_node_id`).
* **State Preconditions:**
  - Both target knowledge nodes must exist and must NOT be in `Archived` status.
  - **DAG Cycle Validation:** The runtime reachability check must return `0` paths from `to_knowledge_node_id` back to `from_knowledge_node_id` (enforcing acyclicity, DECISION-029).
* **Side Effects:**
  - Inserts a `knowledge_relation` record.
* **Events Produced:** `KnowledgeRelationCreated { from_knowledge_node_id, to_knowledge_node_id, relation_type }`

### 1.3 `AddEvidenceCommand`
* **Input Parameters:**
  ```json
  {
    "learner_id": "UUID (Required)",
    "source_type": "String ('Test' | 'Lab' | 'Probe' | 'Chat') (Required)",
    "direction": "String ('positive' | 'negative') (Required)",
    "ai_confidence": "Decimal (Required)",
    "raw_content": "String (JSON payload)",
    "knowledge_node_ids": "UUID[] (Required, non-empty)"
  }
  ```
* **Validation Rules:**
  - `ai_confidence` must be between `0.00` and `1.00`.
  - `knowledge_node_ids` must contain at least 1 valid UUID.
* **State Preconditions:**
  - Mapped knowledge nodes must exist in the database.
* **Side Effects:**
  - Inserts an `evidence` record.
  - Inserts a `knowledge_node_evidence` junction row for each mapped node.
  - Triggers `MasteryService` / `RegressionService` to evaluate updates or regressions.
* **Events Produced:**
  - `EvidenceAdded { evidence_id, learner_id }`

### 1.4 `CreateExpansionCommand`
* **Input Parameters:**
  ```json
  {
    "session_id": "UUID (Required)",
    "parent_node_id": "UUID (Required)",
    "new_node_title": "String (Required)",
    "new_node_description": "String (Required)",
    "reasoning": "String (Required)",
    "traced_to": "String[] (Required)"
  }
  ```
* **Validation & Preconditions:**
  - `new_node_title` must be unique. `parent_node_id` must exist.
* **Side Effects:**
  - Inserts `knowledge_node` in state `local`.
  - Inserts `knowledge_relation` edge (`parent_node_id` -> new_node, relation_type: `expands_to`).
  - Inserts `expansion_record` detailing reasoning and `traced_to` references.
* **Events Produced:** `KnowledgeNodeExpanded { knowledge_node_id, trigger: 'local' }`

### 1.5 `PromoteExpansionCommand`
* **Input Parameters:**
  ```json
  {
    "knowledge_node_id": "UUID (Required)",
    "reasoning": "String (Required)",
    "traced_to": "String[] (Required)"
  }
  ```
* **Preconditions:**
  - Node must exist in status `local`.
* **Side Effects:**
  - Updates `knowledge_node.status = 'structural'`.
  - Inserts/Updates the associated `expansion_record` log.
* **Events Produced:** `KnowledgeNodeExpanded { knowledge_node_id, trigger: 'structural' }`

### 1.6 `ApplyRegressionCommand`
* **Input Parameters:**
  ```json
  {
    "learner_id": "UUID (Required)",
    "knowledge_node_id": "UUID (Required)"
  }
  ```
* **Preconditions:**
  - Cumulative negative weight for the learner-node pair must be $\ge 1.5$ (DECISION-053).
* **Side Effects:**
  - Demotes the `mastery_record.mastery_level` by exactly one level.
  - Resets evaluated negative evidence markers.
* **Events Produced:** `KnowledgeRegressionApplied { learner_id, knowledge_node_id, new_level }`

---

## 2. Query Model (Read Operations)

### 2.1 `GetKnowledgeNodeQuery`
* **Filters:** `knowledge_node_id` (UUID, Required).
* **Output DTO:** Node details + status metadata.

### 2.2 `GetNodeRelationsQuery`
* **Filters:** `knowledge_node_id` (UUID, Required), `direction` (String: `'incoming'` | `'outgoing'` | `'both'`).
* **Output DTO:** List of edges with `from_knowledge_node_id`, `to_knowledge_node_id`, and `relation_type`.

### 2.3 `GetEvidenceQuery`
* **Filters:** `learner_id` (UUID, Required), `knowledge_node_id` (UUID, Optional).
* **Sorting/Pagination:** `created_at` DESC, `limit` & `offset`.
* **Output DTO:** List of evidence entries with source, direction, and mapped nodes.

### 2.4 `GetMasteryQuery`
* **Filters:** `learner_id` (UUID, Required), `knowledge_node_id` (UUID, Required).
* **Output DTO:** `mastery_level`, `teach_composite_score`, `updated_at`.

### 2.5 `GetExpansionHistoryQuery`
* **Filters:** `knowledge_node_id` (UUID, Optional).
* **Output DTO:** List of `expansion_record` rows detailing justifications and `traced_to` links.

---

## 3. Service Layer Design

* **`KnowledgeGraphService`:** Manages CRUD operations on nodes/edges. Responsible for running the reachability path search during cycle checks.
* **`EvidenceService`:** Records user learning evidences, saving junction mappings.
* **`MasteryService`:** Aggregates positive signals, computes composite Bloom-based Teach scores, and saves mastery records.
* **`ExpansionService`:** Manages local and structural expansions and curation records.
* **`RegressionService`:** Calculates negative evidence aggregates and applies level demotions.

---

## 4. Repository Layer Design

* **contracts:** `IKnowledgeNodeRepository`, `IKnowledgeRelationRepository`, `IEvidenceRepository`, `IMasteryRepository`, `IExpansionRepository`.
* **Transaction Boundaries:**
  - `CreateExpansion`: Node insertion + edge insertion + expansion record write must occur in a single database transaction.
  - `ApplyRegression`: Level demotion + evidence consolidation must occur in a single transaction.
* **Concurrency:** `mastery_record` updates enforce optimistic locking utilizing the `version_number` column.

---

## 5. State Rules

* **Node Status transitions:** `draft` -> `structural`, `local` -> `structural`, `local/structural` -> `archived`.
* **Mastery level transitions:** `Unknown` -> `Remember` -> `Explain` -> `Apply` -> `Teach`. Demotions decrement by exactly 1 level.
* **Expansion transitions:** Local curation funnels must log reasoning before structural status is committed.

---

## 6. Explainability & AI Design

All dynamic actions performed by the Knowledge Engine require:
1. **`reasoning`:** Explanatory text saved in `expansion_record.reasoning`.
2. **`confidence`:** Captured in `evidence.ai_confidence` for all probe evaluations.
3. **`traced_to[]`:** Persistent ID references saved in `expansion_record.traced_to` and aggregated via query layers (DECISION-027).
