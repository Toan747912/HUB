# Teaching Capability Model Specification

This document defines the Socratic capability model used by the Teaching Engine to teach a `KnowledgeNode` and achieve "Teach" level mastery.

---

## 1. Pedagogical Sub-Capabilities and Definitions

In accordance with [DECISION-020](../../Docs/11_Decisions/DECISION-020-Teach-Composite-Capability.md) and [DECISION-052](../../Docs/11_Decisions/DECISION-052-Teach-Capability-Composite-Weighting.md), Teach-level mastery is structured across five progressive sub-capabilities, mapping to Bloom's Taxonomy of cognitive levels:

```
[Cognitive Depth]
  ▲
  │   Transfer (25%)  ➔ Application & Synthesis (Project implementation)
  │   Review (25%)    ➔ Evaluation & Connections (Concept mapping)
  │   Guide (25%)     ➔ Guided Self-Correction (Debugging & Problem-solving)
  │   Simplify (15%)  ➔ Conceptual Analogy (Layman translations)
  │   Explain (10%)   ➔ Basic Recall & Knowledge (Syntax & definitions)
```

### 1.1 Explain (Weight: 10%)
- **Definition:** Direct delivery of concepts, definitions, syntax, and fundamental theory.
- **Pedagogical Target:** Ensuring the learner acquires accurate baseline vocabulary and technical specifications.
- **Example:** AI explains the syntax of `jwt.sign()` and the role of the header, payload, and signature.

### 1.2 Simplify (Weight: 15%)
- **Definition:** Explaining complex terms using real-world analogies, layperson translations, or schematic breakdowns.
- **Pedagogical Target:** Checking conceptual understanding by stripping away technical jargon.
- **Example:** AI describes JWT access tokens as a temporary physical entry pass that lists your access privileges, eliminating the need to ask the database security desk on every action.

### 1.3 Guide (Weight: 25%)
- **Definition:** Leading the student through problem-solving and diagnostics using Socratic questioning without providing direct code fixes.
- **Pedagogical Target:** Building debugging capabilities and problem-solving resilience.
- **Example:** Learner has a signature mismatch error. Instead of fixing the secret key, AI prompts: *"What inputs go into generating the signature, and how can we verify that the verification key matches the signing key?"*

### 1.4 Review (Weight: 25%)
- **Definition:** Connecting the active concept to preceding concepts within the Knowledge Graph DAG.
- **Pedagogical Target:** Synthesizing knowledge structures and understanding trade-offs.
- **Example:** AI prompts: *"Contrast access tokens with session-based authentication. In what scenarios does a session-based approach offer better security than JWTs?"*

### 1.5 Transfer Knowledge (Weight: 25%)
- **Definition:** Applying the active concept to a novel project scenario or coding environment.
- **Pedagogical Target:** Generalization and independent application.
- **Example:** AI provides a prompt: *"Implement a middleware function in your Express project that extracts a bearer token, verifies its expiration, and extracts the user ID, handling token expiration errors gracefully."*

---

## 2. Socratic Active Guidance Logic & Criteria

To maintain the Socratic model (particularly in Mode C and Mode D), the Teaching Engine conforms to the following runtime rules:

| Rule | Passive Acquisition (Explain/Simplify) | Active Socratic (Guide/Review/Transfer) |
|---|---|---|
| **Response Format** | Informational prose, diagrams, code blocks. | Questions, diagnostic prompts, exercises. |
| **Code Generation** | Direct code snippets illustrating syntax. | **No direct code fixes.** Only stub code or guidance on syntax rules. |
| **Student Assessment** | Passive acknowledgment (e.g., clicking "Next"). | Code submissions, structural explanations, or trade-off analyses. |

### 2.1 The "No Direct Fix" Socratic Boundary
During Socratic Guidance, the AI Mentor **MUST NOT** provide complete copy-pasteable code blocks to solve the learner's specific task. The prompt must point to the line or conceptual error and ask the student to propose the correction. If the learner remains stuck, the system invokes the **Stuck Detection Model** rather than violating Socratic constraints silently.

---

## 3. Quantitative Mastery Evaluation

Achieving "Teach" mastery requires a composite score of **$\ge 75\%$** ($0.75$) evaluated across all sub-capabilities.

### 3.1 Composite Scoring Formula
$$Score_{Teach} = 0.10 \times S_{Explain} + 0.15 \times S_{Simplify} + 0.25 \times (S_{Guide} + S_{Review} + S_{Transfer})$$

Where:
- $S_{sub\_cap} \in [0.0, 1.0]$ represents the evaluated proficiency of the learner on that sub-capability (as assessed by the Assessment Engine).

### 3.2 Evaluation Pathways to Mastery

| Explain | Simplify | Guide | Review | Transfer | Composite Score | Result | Notes |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| `1.0` | `1.0` | `1.0` | `1.0` | `1.0` | **`1.00`** | **Mastered** | Perfect score across all Bloom levels. |
| `0.0` | `0.0` | `1.0` | `1.0` | `1.0` | **`0.75`** | **Mastered** | Learner bypassed explanations but demonstrated high-level skills. |
| `1.0` | `1.0` | `1.0` | `1.0` | `0.0` | **`0.75`** | **Mastered** | Mastery met despite lacking transfer knowledge. |
| `1.0` | `1.0` | `1.0` | `0.0` | `1.0` | **`0.75`** | **Mastered** | Mastery met despite lacking review synthesis. |
| `1.0` | `1.0` | `1.0` | `0.5` | `0.5` | **`0.60`** | *Needs Work* | Failed to meet the threshold. Must practice review/transfer. |
| `1.0` | `1.0` | `0.0` | `0.0` | `0.0` | **`0.25`** | *Needs Work* | Core Socratic components missing. |
