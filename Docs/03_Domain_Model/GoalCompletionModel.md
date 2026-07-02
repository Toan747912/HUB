# Goal Completion Model Specification

This document defines the mathematical and logical criteria required to transition a `Goal` to the `Completed` state, detailing domain dependencies and evidence requirements.

---

## 1. Goal Completion Criteria

A `Goal` is considered completed when all pedagogical requirements defined in its linked dynamic `Roadmap` are satisfied. 

$$\text{GoalState} \rightarrow \text{Completed} \iff \forall N \in \text{RoadmapNodes}(\text{goal\_id} = G): \text{NodeStatus}(N) = \text{'Completed'}$$

This calculation executes a bottom-up validation sequence:

```
                  ┌───────────────────────────────┐
                  │      Goal: Completed          │
                  └──────────────▲────────────────┘
                                 │ Parent Completion
                  ┌──────────────┴───────────────┐
                  │   All RoadmapNodes Completed  │
                  └──────────────▲────────────────┘
                                 │
                  ┌──────────────┴───────────────┐
                  │ All KnowledgeNodes Mastered   │
                  └──────────────▲────────────────┘
                                 │ S_{Teach} >= 0.75 (DECISION-052)
                  ┌──────────────┴───────────────┐
                  │    Evidence Weight Support    │
                  │   (DECISION-053, Test=1.0)    │
                  └──────────────────────────────┘
```

---

## 2. Domain Dependencies and Verification Flow

Goal completion relies on verification across three domains:

### 2.1 Roadmap Domain Dependency
- Each leaf `RoadmapNode` is linked to one or more `KnowledgeNode`s via `roadmap_node_knowledge_node` (Dependency Edge).
- A leaf `RoadmapNode` transitions to `Completed` when all of its linked `KnowledgeNode` dependencies are verified as mastered.

### 2.2 Assessment Domain Dependency
- A `KnowledgeNode` is verified as mastered when the learner achieves the "Teach" mastery level, represented by a Socratic composite score:
  $$Score_{Teach} = 0.10 \times S_{Explain} + 0.15 \times S_{Simplify} + 0.25 \times (S_{Guide} + S_{Review} + S_{Transfer}) \ge 0.75$$
- The Assessment Domain is the sole write-owner of `KnowledgeNodeMastery` (DECISION-026). The Goal Domain polls or listens to `MasteryLevelAchieved` events to trigger roadmap updates.

### 2.3 Evidence Domain Dependency (DECISION-053)
- Mastery evaluation requires positive evidence. The learner must submit verified code exercises or pass Socratic micro-probes, generating `evidence` links:
  - **Automated Test Evidence:** $SourceWeight = 1.0$
  - **Lab Exercise Evidence:** $SourceWeight = 0.8$
  - **Socratic Probe Evidence:** $SourceWeight = 0.5$
- The final score is computed as:
  $$evidence\_weight = SourceWeight \times AI\_Confidence$$
- A node cannot reach the completion threshold using casual chat evidence alone ($SourceWeight = 0.3$). It requires at least one automated test or lab exercise submission.

---

## 3. Recommendation Engine Interactions

The Goal Domain does not unilaterally change its status to Completed. It requires a recommendation-to-approval sequence:

1. **Detection:** When the final leaf node of the active `Roadmap` transitions to `Completed`, the `Roadmap Engine` flags the roadmap as complete.
2. **Proposal:** The `Recommendation Engine` detects the complete roadmap signal and generates a `RecommendationProposal`:
   - `proposal_type`: `'complete_goal'`
   - `payload_details`: `{"goal_id": "UUID"}`
   - `traced_to[]`: Contains the final `AssessmentResult` IDs of the completed roadmap nodes.
3. **Learner Approval:** The proposal is displayed to the learner.
4. **Transition Execution:** Once the learner clicks "Confirm Completion", the system creates an `ApprovalRecord` and executes the transition:
   - Sets `Goal.state` to `Completed`.
   - Transitions `LearningSession.state` to `Completed`.
   - Emits `GoalCompleted` domain event.
