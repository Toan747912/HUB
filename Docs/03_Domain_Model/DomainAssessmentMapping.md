# Domain Assessment Mapping

- **Status:** Approved Design Document
- **Domain Scope:** Assessment Domain & Engine
- **Traceability:** DECISION-004 (Goal learning philosophy), DECISION-012 (Multi-domain support)

---

## 1. Domain Mapping Matrix

To support multi-domain learning (DECISION-012) without restricting the engine to programming syntax, the Assessment Domain maps different domains to customized evaluation templates and evidence heuristics:

| Domain | Bloom Level | Heuristic Criterion | Primary Evidence Source |
| :--- | :--- | :--- | :--- |
| **Programming** | **Remember** | Syntax terms, basic loop rules. | Test (Multiple Choice) |
| | **Explain** | Explaining code execution flow / complexity. | Probe (Dialogue) |
| | **Apply** | Writing compiler-validated, passing code blocks. | Lab (Unit Tests) |
| | **Teach** | Performing code review / Guide debugging. | Chat (Interactions) |
| **Marketing** | **Remember** | Terms (e.g. CTR, SEO, CAC) and formulas. | Test (Definitions) |
| | **Explain** | Explaining target audience segmentation choice. | Probe (Dialogue) |
| | **Apply** | Copywriting campaign ads / Setting up budget sheets. | Lab (Scenario templates) |
| | **Teach** | Auditing external campaigns / Guiding plans. | Chat (Evaluations) |
| **Design (UI/UX)** | **Remember** | Design heuristics (Gestalt, hierarchy), tool names. | Test (MCQ) |
| | **Explain** | Justifying layout choices and user flows. | Probe (Dialogue) |
| | **Apply** | Generating mockups / Component auto-layouts. | Lab (Figma API checks) |
| | **Teach** | Performing design critique / Defining design systems. | Chat (Critiques) |

---

## 2. Evidence Source Weight Baselines per Domain

The weight of evidence is dynamically calculated but conforms to domain-specific reliability inputs:

* **Programming:**
  - Automated Lab/Sandbox test results are highly reliable (`SourceWeight = 0.8`), while Chat messages have lower raw assessment value (`SourceWeight = 0.3`).
* **Marketing & Design:**
  - Open-ended explanations and design critique justifications (Probes) are more reliable for evaluation (`SourceWeight = 0.6`), while automated test scores carry less weight (`SourceWeight = 0.4`) due to the creative nature of the domains.
