# Session Progress Model Specification

This document defines the formulas, mappings, and snapshotted databases used to calculate and persist learning progress within the **Learning Session Domain**.

---

## 1. Progress Formulas & Calculations

Session progress calculates the completion percentage of the active roadmap, excluding optional nodes:

$$Progress\% = \frac{\sum \text{Completed Non-Optional Leaf Nodes}}{\sum \text{Total Non-Optional Leaf Nodes}} \times 100$$

### 1.1 Progress Snapshots
Every time a `SubSession` transitions to `Completed` (or when a node is added/removed after a confirmed roadmap modification), the system commits a new record to the `session_progress_snapshot` table:
- `completed_nodes_count`
- `total_nodes_count`
- `progress_percentage`
- `snapshot_payload` (JSON listing the states of all nodes)

---

## 2. Cross-Domain Progression Mappings

Progress calculation connects the Assessment, Roadmap, and Recommendation domains:

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. Assessment Domain: Mastery verified (Teach >= 0.75)           │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. Roadmap Domain: RoadmapNode status set to 'Completed'          │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. Learning Session Domain: Updates session_progress_snapshot    │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. Recommendation Domain: Triggers GoalCompletionProposal        │
└──────────────────────────────────────────────────────────────────┘
```

### 2.1 Mappings Flow
1. **Mastery Verification:** The Assessment Domain evaluates Evidence and updates the composite score for `KnowledgeNodeMastery`. When the score crosses $\ge 75\%$ (DECISION-052), it emits `MasteryLevelAchieved`.
2. **Roadmap Node Update:** The Roadmap Domain listens to mastery achievements. When all KnowledgeNodes mapped to a leaf `RoadmapNode` meet the threshold, the node status is updated to `Completed`.
3. **Session Progress Snapshot:** The Learning Session Domain listens to `RoadmapNodeCompleted` events, recalculates the progress percentage, and writes a new `session_progress_snapshot` record.
4. **Completion Recommendation:** If the progress percentage reaches $100.00\%$, the Recommendation Engine detects that no active nodes remain and generates a proposal to complete the Goal.
