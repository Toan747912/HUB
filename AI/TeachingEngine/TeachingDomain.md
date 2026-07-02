# Teaching Domain Specification

## 1. Domain Characterization: Capability Orchestrator

The Teaching Engine is officially classified as a **Capability Orchestrator** rather than a transactional Core Domain (aligned with [TEACHING_VS_MENTOR_INTERACTION_REVIEW.md](../../Docs/06_Database/TEACHING_VS_MENTOR_INTERACTION_REVIEW.md)). 

Unlike transactional domains (such as Goal & Roadmap, Knowledge Graph, or Assessment), the Teaching Engine:
- **Does not own business-critical transactional Aggregate Roots.** It does not directly write to core domain entities (like `roadmap`, `knowledge_node`, or `knowledge_node_mastery`) under its own namespace.
- **Operates purely on read-orchestration.** It reads inputs from multiple domains to decide what content to present and how to interact Socratic-style.
- **Writes via cross-cutting infrastructure.** It persists its decisions through the shared cross-cutting **Decision Persistence** (`decision_header` + `teaching_decision_detail`, `stuck_detection_decision_detail`, `intervention_decision_detail`) and **Traceability** (`trace_link`) models.
- **Delegates state modifications.** It triggers outcomes that are processed and written by their respective write-owner domains (e.g., Assessment Domain writes Mastery updates, Knowledge Graph Domain writes graph expansions).

```mermaid
graph TD
    subgraph Input Domains
        R[Goal & Roadmap Domain] -->|Read Roadmap/Nodes| TE
        K[Knowledge Graph Domain] -->|Read Nodes/Prerequisites| TE
        A[Assessment Domain] -->|Read Mastery/Scores| TE
        REC[Recommendation Domain] -->|Read Proposals| TE
    end

    subgraph Teaching Engine (Orchestrator)
        TE[Teaching Engine]
    end

    subgraph Output Domains
        TE -->|1. Generate Evidence| EV[Evidence Domain]
        TE -->|2. Trigger Assessment| ASD[Assessment Domain]
        TE -->|3. Trigger Local Graph Expansion| KGD[Knowledge Graph Domain]
        TE -->|4. Propose Roadmap Adjustments| RMD[Goal & Roadmap Domain]
    end

    classDef default fill:#1e1b4b,stroke:#4338ca,color:#fff;
    classDef output fill:#064e3b,stroke:#059669,color:#fff;
    class TE default;
    class EV,ASD,KGD,RMD output;
```

---

## 2. Boundary Controls and Constraints

### 2.1 The Roadmap Boundary Rule
- **Strict Limitation:** The Teaching Engine **MUST NOT** directly write, modify, or delete any Roadmap structures (`roadmap`, `roadmap_node`, `roadmap_node_knowledge_node` links).
- **Roadmap Governance Integration:** If the Teaching Engine determines that the Learner's roadmap needs to change (e.g., bypassing a node or inserting a prerequisite), it MUST route this request through the **Recommendation Engine** to generate a `RecommendationProposal`. The proposal must then be approved by the Learner (producing an `ApprovalRecord`) before the Roadmap Domain applies the change.

### 2.2 Socratic Capabilities
The Teaching Engine must support five distinct pedagogical sub-capabilities:
1. **Explain:** Direct delivery of concepts, definitions, and syntax.
2. **Simplify:** Translating technical jargon, using analogies, and breakdown of complex concepts.
3. **Guide:** Active Socratic guidance using questions, hints, and error diagnostics to let the learner self-correct.
4. **Review:** Synthesizing previously learned nodes, connecting past knowledge to current focus.
5. **Transfer:** Formulating project-based challenges, code implementation scenarios, and cross-concept applications.

### 2.3 Explainability First Constraint
In accordance with [DECISION-048](../../Docs/11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md), all decisions executed by the Teaching Engine (specifically **D1: Content Selection**, **D9a: Stuck Detection**, and **D9b: Intervention Tier Selection**) must be explainable.
- Every teaching response and decision output envelope **MUST** carry:
  - `confidence`: A numeric score between `0.0` and `1.0` representing AI confidence.
  - `reasoning`: A detailed string justifying the decision.
  - `traced_to[]`: An array of unique IDs linking the decision back to its source evidence, assessment result, or recommendation proposal.
- Every decision must write to `decision_header` and its respective detail table (`teaching_decision_detail`, `stuck_detection_decision_detail`, `intervention_decision_detail`).

---

## 3. Domain Interactions and Information Flow

### 3.1 Input Mapping
| Input Source | Read Entities | Purpose in Teaching |
|---|---|---|
| **Goal & Roadmap** | `goal`, `roadmap_node`, `roadmap_node_knowledge_node` | Identifies the active roadmap target and available node pathways. |
| **Knowledge Graph** | `knowledge_node`, `knowledge_edge` | Inspects pre-requisites and topological dependencies. |
| **Assessment** | `knowledge_node_mastery`, `assessment_result` | Understands the learner's current mastery levels and detailed score breakdowns. |
| **Recommendation** | `recommendation_proposal` | Consumes approved recommendation actions (e.g., "re-explain Node X due to regression"). |

### 3.2 Output Mapping
| Output Destination | Action | Trigger Event |
|---|---|---|
| **Evidence Domain** | Creates `evidence` and `evidence_link` | Triggered when the learner submits answers, code, or explanations. |
| **Assessment Domain** | Invokes verification to create `assessment_result` | Triggered when new evidence needs evaluation against mastery. |
| **Knowledge Graph Domain** | Triggers local `knowledge_edge` expansion | Triggered when a learner asks a follow-up outside the static graph boundary (D5 Local Expansion). |
| **Goal & Roadmap Domain** | Proposes changes via recommendation request | Triggered when the learner exceeds mastery bounds or requires prerequisite insertions. |
