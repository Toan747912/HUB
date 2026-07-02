# Roadmap Progression Model Specification

This document defines how progress is calculated across roadmap nodes, milestones, and the overall roadmap, detailing triggers for recommendations and assessments.

---

## 1. Hierarchy Progress Calculations

Progression is computed bottom-up, starting from the leaf learning nodes and propagating to parent milestones and the root roadmap:

```
                  ┌───────────────────────────────┐
                  │      Roadmap: Completed       │
                  └──────────────▲────────────────┘
                                 │
                  ┌──────────────┴───────────────┐
                  │ All Milestone Nodes Completed │
                  └──────────────▲────────────────┘
                                 │
                  ┌──────────────┴───────────────┐
                  │ All Leaf Learning Nodes Comp. │
                  └──────────────▲────────────────┘
                                 │ S_{Teach} >= 0.75
                  ┌──────────────┴───────────────┐
                  │ Mapped KnowledgeNodes Mastered│
                  └──────────────────────────────┘
```

### 1.1 Leaf Node Completion
A leaf `RoadmapNode` has a binary status: `Completed` or not completed.
- **Condition:** All mapped `KnowledgeNode` masteries must achieve a composite score $\ge 75\%$ (DECISION-052).
- **Trigger:** Listen for `MasteryLevelAchieved` or `AssessmentResultCreated` events from the Assessment Domain.

### 1.2 Milestone Completion
A parent milestone node status updates automatically when its child nodes are completed:
- **Condition:** All non-optional children nodes must have `status = 'Completed'`. Optional nodes are excluded from the calculation:
$$\text{MilestoneNodeStatus} = \text{'Completed'} \iff \forall C \in \text{Children}(Node) \setminus \text{OptionalChildren}: \text{Status}(C) = \text{'Completed'}$$

### 1.3 Roadmap Completion
The entire roadmap transitions to `Completed` when all of its root nodes (major milestones) are completed:
$$\text{RoadmapState} = \text{'Completed'} \iff \forall M \in \text{RootMilestones}(Roadmap): \text{Status}(M) = \text{'Completed'}$$

---

## 2. Assessment and Recommendation Triggers

Node transitions trigger follow-up actions across the AI Mentor OS domains:

```
[Leaf Node Completed] ➔ [Emit RoadmapNodeCompleted] ➔ [Recommendation Engine]
                                                             │
                    ┌────────────────────────────────────────┴────────────────────────────────────────┐
                    ▼                                                                                 ▼
      [Scenario A: Next Node Unlocked]                                               [Scenario B: Pathway Completed]
    AI checks if target belongs to a                                                AI generates GoalCompletionProposal
    collapsed branch; proposes lazy expansion.                                      linked to completed roadmap snapshot.
```

### 2.1 Assessment Triggers
- When a learner enters an **Assessment Node**, the Roadmap Domain emits `AssessmentNodeEntered`.
- The **Assessment Engine** intercepts this, suspending standard learning loops and initiating a Socratic probe sequence to verify concept retention.

### 2.2 Recommendation Triggers
- **Lazy Branch Expansion:** When a leaf node is completed, the Recommendation Engine evaluates what prerequisite nodes are unlocked. If the next node in the prerequisite tree belongs to a collapsed/unexpanded milestone branch:
  1. The AI compiles a `RecommendationProposal` suggesting the expansion of that branch (DECISION-005).
  2. The learner approves, adding the child nodes to the active roadmap structure.
- **Goal Completion Recommendation:** When the last milestone node on the roadmap is completed:
  1. The Recommendation Engine generates a proposal to complete the Goal.
  2. Learner approval transitions both the Goal and the Roadmap to `Completed`.
