# Knowledge Regression Model

- **Status:** Approved Design Document
- **Domain Scope:** Knowledge Domain & Engine (Assessment Integration)
- **Traceability:** DECISION-021 (Evidence weighting), DECISION-053 (Regression formula & threshold)

---

## 1. Principles of Regression

* **No Time Decay (DECISION-016):** Mastery levels are permanent unless contradicted by performance.
* **Evidence-Driven:** Regression is triggered only when the system accumulates verifiable evidence of a learner's misunderstanding or loss of skill (Negative Evidence).
* **Adaptability:** Prevents the user from getting stuck with content that is too difficult if their actual understanding has regressed.

---

## 2. Evidence Weighting Formula

Every evaluation event creates an `Evidence` record containing a specific direction (positive or negative) and an AI model confidence rating.

### 2.1 The Formula
The weight of a single piece of evidence is computed as:

$$EvidenceWeight = SourceWeight \times AI\_Confidence$$

### 2.2 Source Weight Baselines
The source weight is determined by the reliability of the evaluation activity:

| Source Type | Source Weight | Description |
| :--- | :---: | :--- |
| **`Test`** | `1.0` | Formal exam or quiz checking syntax and logic. |
| **`Lab`** | `0.8` | Hands-on sandbox exercises and project test suites. |
| **`Probe`** | `0.5` | In-session conversational verification questions. |
| **`Chat`** | `0.3` | General dialogue messages and debug requests. |

---

## 3. Regression Trigger Rules

1. **Aggregation Window:** The Assessment service aggregates all *unprocessed* negative evidence weights associated with a specific learner and `KnowledgeNode` within the current context window.
2. **Threshold Trigger:** If the sum of negative evidence weights is greater than or equal to `1.5`, a regression event is triggered:

   $$\sum (SourceWeight \times AI\_Confidence) \ge 1.5$$

3. **Mastery Demotion:**
   - The learner's `KnowledgeNodeMastery.mastery_level` is demoted by exactly **one level** (e.g. from `Apply` to `Explain`).
   - The negative evidence sum is reset (marked as processed).
   - A `KnowledgeRegressionDetected` domain event is emitted.
   - The Recommendation Engine consumes this event to adjust the learner's roadmap, proposing refresher exercises.
