# Roadmap Versioning Model Specification

This document defines how the Roadmap Domain implements versioning, cloning procedures during goal modifications (DECISION-032), and historical audit requirements.

---

## 1. Roadmap Immutability and Version Chains

To maintain consistency with the **Immutable Goal Principle** (DECISION-032) and **Explainability First** (DECISION-048), approved and active roadmaps are structurally immutable. 
- **The Context Risk:** If a roadmap was mutated at runtime (e.g. deleting a Node or swapping prerequisites), historical data such as `LearningSessionTransition` logs and `AssessmentResult` metrics would lose their structural anchor.
- **The Solution:** Roadmaps are versioned using a singly-linked list chain:

$$\text{Roadmap } v_1 \longleftarrow \text{Roadmap } v_2 \longleftarrow \text{Roadmap } v_3 (\text{Active})$$

Each `Roadmap` record is linked to a single specific `Goal` version. 

---

## 2. Cloning Workflow during Goal Change

When a learner modifies their Goal statement (triggering a superseding event, DECISION-032), the Roadmap Domain executes a transaction to clone and transition the pathway:

```
[1. Goal v(N) Superseded] ➔ [2. Clone Roadmap v(N)] ➔ [3. Apply Scope Modifications]
Triggers cascade in            Copies all nodes, state,     Inserts or removes nodes
Roadmap Domain.                and dependencies.            as draft proposals on cloned path.
       ▲                                                           │
       │                                                           ▼
[6. Active Roadmap v(N+1)] ◄─ [5. Learner Approves]    ◄─ [4. Log Predecessor link]
Cloned path activated.         ApprovalRecord created,      Points new roadmap version
New LearningSession begins.    old roadmap Superseded.      to old roadmap version.
```

### 2.1 Cloning Step Details
1. **Creation:** A new `Roadmap` record ($v_{N+1}$) is inserted with `state = 'Draft'`, linked to the new Goal ($Goal_{vN+1}$).
2. **Node Copying:** All nodes (`roadmap_node` records) from the old roadmap ($v_N$) are duplicated:
   - Preserves completed nodes and their completion indicators.
   - Preserves locked/unlocked statuses of active pathways.
   - Copies internal dependency edges (`roadmap_node_dependency`).
3. **Modification Injection:** The new node changes (e.g. adding a module or reorganizing paths) are applied as draft edits on the new cloned roadmap nodes.
4. **Relationship Linking:** The new roadmap’s `predecessor_roadmap_id` is populated with the ID of $v_N$.
5. **Archival:** The old Roadmap ($v_N$) transitions to `Superseded`.

---

## 3. Version History & Audit Trail Requirements

To ensure that every structural shift is verifiable, the following audit data must be written:

### 3.1 Audit Log Tables
- **`roadmap_version` Table:** A historical table documenting each version transition, version reasoning, and links.
- **`roadmap_approval` Table:** Links the version shift to the learner's explicit `ApprovalRecord` and the AI recommendation `decision_header_id` (D3 Recommendation Signal Synthesis).

### 3.2 Required Audit Columns
Every `roadmap` and `roadmap_node` record carries:
- `created_at` / `updated_at`: Timestamps.
- `created_by_actor_type` / `updated_by_actor_type`: `'learner'` | `'backend_core'` | `'ai_service'`.
- `created_by_actor_id` / `updated_by_actor_id`: UUIDs pointing to the execution actor.
- `change_reasoning`: Explainability text.
- `decision_header_id`: FK linking to the persistence header (D6: Roadmap Mapping - Dependency Edge Selection).
