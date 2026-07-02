# Mastery Calculation Model

- **Status:** Approved Design Document
- **Domain Scope:** Knowledge Domain & Engine (Assessment Integration)
- **Traceability:** DECISION-020 (Teach composite score), DECISION-052 (Teach progressive weights)

---

## 1. Base Mastery Levels (Bloom's Taxonomy)

A learner's competence level is determined by the Assessment Domain based on evaluated Evidence. Mastery is evidence-driven and does not decay with time.

| Mastery Level | Criteria | Required Evidences |
| :--- | :--- | :--- |
| **`Remember`** | Basic recall of facts and syntax. | Positive signals from multiple-choice tests or syntax questionnaires. |
| **`Explain`** | Explaining the concept in their own words. | Positive signals from open-ended probe questions. |
| **`Apply`** | Executing practical coding exercises. | Positive signals from sandbox laboratories, project builds, or test suite completions. |
| **`Teach`** | Deep structural knowledge evaluation. | Positive signals across 5 sub-capabilities evaluated via a progressive composite score. |

---

## 2. Teach Composite Weighted Model (DECISION-052)

To attain the terminal `Teach` level, a learner is assessed across five specific sub-capabilities:

### 2.1 Sub-Capabilities Definitions
1. **Explain:** Clearly presenting the concepts to a beginner.
2. **Simplify:** Stripping away jargon to explain the core intuition.
3. **Guide:** Stepping a peer through debugging a problem without giving away the answer.
4. **Review:** Identifying flaws and reviewing code written by others.
5. **Transfer:** Applying the concept analogies to completely different domains.

### 2.2 Formula & Weights
Each sub-capability is evaluated on a scale of `0.0` (No competence) to `1.0` (Complete mastery). The composite `Teach` score is computed as follows:

$$TeachScore = (0.10 \times Explain) + (0.15 \times Simplify) + (0.25 \times Guide) + (0.25 \times Review) + (0.25 \times Transfer)$$

* **Mastery Threshold:** A learner is officially granted `Teach` level mastery if and only if:
  
  $$TeachScore \ge 0.75$$

---

## 3. Dynamic Mastery Upgrades

1. **Step-by-step Promotion:** Upgrades from `Unknown` through `Apply` are achieved sequentially as positive evidence links are written to the database.
2. **Teach Assessment Trigger:** Once a learner attains `Apply` level, the AI Mentor unlocks interactive "Teach-level" scenarios (peer code reviews, mentoring chat scripts).
3. **Mastery Write:** The Assessment service calculates the composite score, records it in `dbo.knowledge_node_mastery.teach_composite_score`, and updates the `mastery_level` to `Teach` if the threshold is met.
