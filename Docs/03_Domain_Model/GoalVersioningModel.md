# Goal Versioning Model Specification

This document details the versioning, superseding workflow, and auditability model of the `Goal` Aggregate Root, enforcing the **Immutable Goal Principle** (DECISION-032).

---

## 1. The Immutable Goal Principle

Under [DECISION-032](../../Docs/11_Decisions/DECISION-032-Immutable-Goal.md), a `Goal` record is strictly immutable. 
- **The Context Risk:** If a goal statement was mutable (e.g. changing "Learn SQL basics" to "Build a microservices database in PostgreSQL"), all historical records (`Evidence`, `AssessmentResult`, and `KnowledgeNodeMastery` evaluations) would lose their semantic context. It would be impossible to answer: *"Did the learner understand SQL basics at time T, or were they failing the microservices criteria?"*
- **The Solution:** We lock the `statement` column on the `goal` table using database write constraints. Any change of intent, refinement, or scope extension requires creating a new version of the goal, preserving the old version as a read-only audit log.

---

## 2. Superseding Workflow

When a learner modifies their goal (either manually or after confirming a recommendation proposal from the AI), the system executes a transactional **Superseding Workflow**:

```
[1. User Requests Change] ➔ [2. Create New Goal v(N+1)] ➔ [3. Link Predecessor]
User updates statement or      Inserts a new goal record    Sets predecessor_goal_id
AI recommends expansion.      with incremented version.    to old goal v(N).
       ▲                                                           │
       │                                                           ▼
[6. Start New Session]  ◄─ [5. Clone Roadmap]    ◄─ [4. Archive Old Goal v(N)]
Creates new LearningSession   Clones v(N) Roadmap and     Sets old goal state to
gained to Goal v(N+1).        maps to Goal v(N+1).        'Superseded'. Session archived.
```

### 2.1 Sequential Step Execution
1. **Instantiation:** The database inserts a new `Goal` record ($v_{N+1}$):
   - Copies the updated statement text.
   - Sets the state to `Draft`.
2. **Lineage Pointer:** The new goal's `predecessor_goal_id` (or `superseded_by_goal_id` on the old goal) is populated to link the lineage.
3. **Session Archival:** The active `LearningSession` of the old Goal ($v_N$) is transitioned to `Archived` (DECISION-032). This freezes progress on the old path.
4. **Roadmap Cloning:** The `Roadmap` of the old goal is cloned:
   - All completed nodes are preserved.
   - The new `Roadmap` is assigned to Goal $v_{N+1}$.
5. **Activation:** The old Goal ($v_N$) state transitions to `Superseded`. The new Goal ($v_{N+1}$) transitions to `Active`.
6. **New Session Startup:** A new `LearningSession` is initialized for Goal $v_{N+1}$, and the learner resumes study on the new roadmap version.

---

## 3. Version Chain Behavior

Goals are connected sequentially in a singly-linked list structure:

$$\text{Goal } v_1 \longleftarrow \text{Goal } v_2 \longleftarrow \text{Goal } v_3 (\text{Active})$$

Each node in the chain maintains:
- `goal_id`: Current primary key.
- `version_number`: Monotonically increasing integer (starts at `1`).
- `superseded_by_goal_id` (or `predecessor_goal_id`): Pointing to the adjacent version.
- `version_reasoning`: Text field logging why the version change occurred.

---

## 4. Auditability and Explainability Requirements

To comply with the **Explainability First** constraint (DECISION-048), every goal version change must register its provenance:

- **AI-Guided Versioning:** If the version change is proposed by the Recommendation Engine (e.g., suggesting a prerequisite addition), the superseding transaction **MUST** record a `decision_header_id` referencing a `decision_header` of type `D3` (Recommendation Signal Synthesis).
- **Manual Versioning:** If the user initiates the change, the transaction logs the actor attributes (`created_by_actor_type = 'learner'`) and maps the approval record.
- **Audit Columns:**
  - `created_at`: Datetime of the transition.
  - `created_by_actor_type`: `'learner'` | `'backend_core'` | `'ai_service'`.
  - `created_by_actor_id`: UUID of the actor.
  - `change_reasoning`: Explainability text justifying the scope alteration.
