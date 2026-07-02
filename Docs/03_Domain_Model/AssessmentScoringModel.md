# Assessment Scoring Model

- **Status:** Approved Design Document
- **Domain Scope:** Assessment Domain & Engine
- **Traceability:** DECISION-020 (No Pass/Fail), DECISION-030 (AssessmentResult structure), DECISION-052 (Teach composite weights), DECISION-053 (Regression trigger)

---

## 1. Remember, Explain, Apply Evaluation Rules

Evaluation does not use a binary "pass/fail" check. It evaluates competence as a continuous gradient across the taxonomy:

1. **Remember Level Evaluation:**
   - *Data Source:* Quizzes, multiple-choice tests.
   - *Heuristic:* Looks at the ratio of correct selections. A positive signal is written if correct ratio is $\ge 80\%$.
2. **Explain Level Evaluation:**
   - *Data Source:* Open-ended dialogue responses.
   - *Heuristic:* The AI evaluator checks semantic consistency, terminology coverage, and clarity, returning an observed level from the capability envelope.
3. **Apply Level Evaluation:**
   - *Data Source:* Code outputs, build scripts, sandbox tests.
   - *Heuristic:* Verified by passing test-suite cases. Positive signals are written when the sandbox tests compile and pass all automated assertions.

---

## 2. Teach Composite Weighted Model (DECISION-052)

When a learner attempts a `Teach` level task, they are scored across five sub-capabilities on a scale of `0.00` to `1.00`:

$$TeachScore = (0.10 \times Explain) + (0.15 \times Simplify) + (0.25 \times Guide) + (0.25 \times Review) + (0.25 \times Transfer)$$

* **Threshold for Level Promotion:**
  
  $$TeachScore \ge 0.75$$

* **Persisted Scoring Profile:** The database stores the detailed float breakdown within `mastery_record.teach_composite_score` and the JSON audit properties inside `assessment_result.score_details`.

---

## 3. Evidence Weight & Regression Integration (DECISION-053)

Assessment dynamically evaluates negative evidence weights to prevent stagnation.

### 3.1 Cumulative Weights
Each evidence item carries a weight:

$$Weight = SourceWeight \times AI\_Confidence$$

Baselines: `Test` = 1.0, `Lab` = 0.8, `Probe` = 0.5, `Chat` = 0.3.

### 3.2 Regression Rule
If the sum of negative weights mapped to a node reaches or exceeds `1.5`:

$$\sum (SourceWeight \times AI\_Confidence) \ge 1.5$$

The Assessment service automatically demotes the `mastery_level` by exactly 1 level, resets the negative weight accumulator, and emits a `KnowledgeRegressionDetected` event.
