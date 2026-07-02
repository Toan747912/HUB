# Knowledge Domain Model

- **Status:** Approved Design Document
- **Domain Scope:** Knowledge Domain & Engine
- **Traceability:** DECISION-009 (Knowledge Philosophy), DECISION-010 (Knowledge Graph), DECISION-024 (Node unification), DECISION-026 (Assessment boundaries)

---

## 1. Domain Entities & Value Objects

The Knowledge Domain models the canonical, structured mapping of academic/professional concepts. It does not track personalized learning schedules.

### 1.1 `KnowledgeNode` (Aggregate Root)
The single representation of a core concept or skill area in the system.
* **Attributes:**
  - `knowledge_node_id`: UUID (Primary Key)
  - `title`: String (Unique name of the node, e.g. "JWT Signature Verification")
  - `description`: String (Detailed description)
  - `status`: Enum (`draft` | `local` | `structural` | `archived`)
  - **Audit Fields:** `created_at`, `created_by_actor_type`, `created_by_actor_id`, `updated_at`, `updated_by_actor_type`, `updated_by_actor_id`.

### 1.2 `KnowledgeEdge` (Entity)
A directed relationship between two `KnowledgeNode` entities.
* **Attributes:**
  - `from_knowledge_node_id`: UUID (FK referencing parent/prerequisite node)
  - `to_knowledge_node_id`: UUID (FK referencing child/expanded node)
  - `relation_type`: Enum (`prerequisite_of` | `expands_to` | `related_to`)
  - **Audit Fields:** `created_at`, `created_by_actor_type`, `created_by_actor_id`.

### 1.3 `KnowledgeNodeMastery` (Aggregate Root)
Tracks a specific learner's progress against a `KnowledgeNode`. Written *only* by the Assessment Domain (DECISION-026).
* **Attributes:**
  - `knowledge_node_mastery_id`: UUID (Primary Key)
  - `learner_id`: UUID (FK to Learner auth)
  - `knowledge_node_id`: UUID (FK to KnowledgeNode)
  - `mastery_level`: Enum (`Unknown` | `Remember` | `Explain` | `Apply` | `Teach`)
  - `teach_composite_score`: Decimal (0.0 to 1.0, tracking sub-capability weights)
  - `updated_at`: DateTimeOffset
  - `version_number`: BigInt (concurrency check token, DECISION-044)

### 1.4 `ExpansionRecord` (Entity)
Logs the reasoning and trace mappings for dynamic, structural expansions of the Knowledge Graph (DECISION-023/027).
* **Attributes:**
  - `expansion_record_id`: UUID (Primary Key)
  - `knowledge_node_id`: UUID (FK to expanded node)
  - `reasoning`: String (Explanation text)
  - **Traceability:** `traced_to`: string[] (references to the prompting source answers or roadmap requests)
  - **Audit Fields:** `created_at`, `created_by_actor_type`, `created_by_actor_id`.

---

## 2. Structural Boundaries: `KnowledgeNode` vs. `RoadmapNode`

To maintain clean separation between domain knowledge structure and individual learning tracks:

| Aspect | `KnowledgeNode` | `RoadmapNode` |
| :--- | :--- | :--- |
| **Domain Scope** | **Knowledge Domain** | **Goal & Roadmap Domain** |
| **Definition** | A canonical, goal-agnostic concept in the mastery hierarchy. | A personalized step in a learner's sequence to achieve a specific goal. |
| **Graph Structure** | Direct relation inside a global **DAG** (Knowledge Graph). | Sequenced items in a **tree or path** (Roadmap graph). |
| **Cardinality** | 1:Many (One `KnowledgeNode` maps to many `RoadmapNode` instances across learners). | Many:1 (A single roadmap step references exactly one `KnowledgeNode`). |
| **State Mutability** | Read-only to learners; shared globally. | Mutable; personalized and updated per learner. |

---

## 3. Domain Events

* **`KnowledgeNodeExpanded`**
  - *Description:* Emitted when a new node is dynamically added to the canonical Knowledge Graph.
  - *Payload:* `{ knowledge_node_id: UUID, title: String, expansion_type: 'local' | 'structural', trigger_reason: String }`

* **`KnowledgeNodeMasteryUpdated`**
  - *Description:* Emitted when a learner's mastery level or teach composite score is updated by the Assessment Domain.
  - *Payload:* `{ learner_id: UUID, knowledge_node_id: UUID, old_level: String, new_level: String, teach_score: Decimal }`
