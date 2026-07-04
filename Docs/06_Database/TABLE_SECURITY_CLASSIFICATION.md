# Table Security Classification — Supabase Policy Preparation

> **⛔ SUPERSEDED (2026-07-02):** This document describes a Postgres/Supabase RLS architecture that was never implemented. [DECISION-058](../11_Decisions/DECISION-058-MongoDB-Canonical-Persistence-Store.md) establishes MongoDB as the canonical persistence platform, with access control enforced entirely in the NestJS application layer (JWT + RBAC) instead of database-level row security. Retained for historical record only — do not use as current architecture guidance.


> **Round:** Supabase Policy Preparation Review (post–RLS Architecture Review).  
> **Scope:** All 17 tables from DDL Round 1, 2, and 3.  
> **No SQL. No `CREATE POLICY`. Architecture review only.**  
> **Sources:** [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md), [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md), [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md), [RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md), [RLS_POLICY_STRATEGY.md](RLS_POLICY_STRATEGY.md), [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md).

---

## 0. Classification Definitions

| Category | RLS intent | `authenticated` | `service_role` |
|---|---|---|---|
| **Strict RLS** | Row ownership via `learner_id` (direct or FK chain to `auth.uid()`) | SELECT own rows only; no direct INSERT/UPDATE/DELETE for Commands | Bypass RLS; all writes via Application Services |
| **Shared Access** | Role-based, not ownership-based | SELECT all rows (global knowledge) | Bypass RLS; writes only via designated Service (KnowledgeExpansionService) |
| **Service Only** | RLS enabled; no client-facing policies | Deny all (no policies) | Sole access path |
| **Never Exposed** | Service Only + architectural ban on any direct or raw client access | Deny all | Sole access path; data surfaced only via Backend Read Models |

**Note:** Every table in this schema should have RLS **enabled**. `service_role` always bypasses RLS (Supabase platform behavior). Categories describe what policies exist for `authenticated`, not whether RLS is on.

---

## 1. Round 1 — Identity / Goal / Roadmap / Learning Session (8 tables)

### 1.1 `learner`

| Field | Value |
|---|---|
| **Category** | **Strict RLS** |
| **Why** | Root of the ownership chain ([DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md): `learner.id = auth.users.id`). Every other Learner-owned table derives access from this identity. |
| **Owner** | Identity Module — AccountLifecycleService |
| **Readers** | The Learner themselves (`id = auth.uid()`); Backend (all Modules, via service_role) |
| **Writers** | AccountLifecycleService only (including `anonymized_at` per DECISION-037); Supabase Auth creates `auth.users` (outside Backend RLS scope) |

---

### 1.2 `goal`

| Field | Value |
|---|---|
| **Category** | **Strict RLS** |
| **Why** | Direct `learner_id`; immutable personal intent (DECISION-032). Cross-user leakage would expose another Learner's learning objectives. |
| **Owner** | Goal & Roadmap Module — RoadmapMappingService |
| **Readers** | Owning Learner only |
| **Writers** | RoadmapMappingService only (append-only INSERT; no Learner direct write) |

---

### 1.3 `roadmap`

| Field | Value |
|---|---|
| **Category** | **Strict RLS** |
| **Why** | No direct `learner_id`; ownership via 1-hop FK chain `goal.learner_id`. Personalised structure tied 1:1 to Goal. |
| **Owner** | Goal & Roadmap Module — RoadmapMappingService |
| **Readers** | Owning Learner (via `goal`) |
| **Writers** | RoadmapMappingService only |

---

### 1.4 `roadmap_node`

| Field | Value |
|---|---|
| **Category** | **Strict RLS** |
| **Why** | 2-hop ownership chain (`roadmap` → `goal` → `learner_id`). Tree structure is Learner-specific roadmap content. |
| **Owner** | Goal & Roadmap Module — RoadmapMappingService |
| **Readers** | Owning Learner |
| **Writers** | RoadmapMappingService only (mutations gated by `approval_record` governance) |

---

### 1.5 `approval_record`

| Field | Value |
|---|---|
| **Category** | **Strict RLS** |
| **Why** | Append-only audit of roadmap governance; Learner-owned via `roadmap`→`goal` chain **or** direct `approved_by_learner_id = auth.uid()`. Dual read path is intentional (owner of roadmap vs. approver). |
| **Owner** | Goal & Roadmap Module — RoadmapMappingService |
| **Readers** | Owning Learner of the parent Roadmap; optionally the approver when same Learner |
| **Writers** | RoadmapMappingService (proposal metadata); Learner approval executed via Backend Command, not direct INSERT |

---

### 1.6 `learning_session`

| Field | Value |
|---|---|
| **Category** | **Strict RLS** |
| **Why** | Direct `learner_id`; orchestrator state for Learner×Goal (DECISION-028). |
| **Owner** | Learning Session Module — LearningSessionOrchestrationService |
| **Readers** | Owning Learner |
| **Writers** | LearningSessionOrchestrationService only |

---

### 1.7 `sub_session`

| Field | Value |
|---|---|
| **Category** | **Strict RLS** |
| **Why** | 1-hop via `learning_session.learner_id`; scoped study unit within a session. |
| **Owner** | Learning Session Module — LearningSessionOrchestrationService |
| **Readers** | Owning Learner |
| **Writers** | LearningSessionOrchestrationService only |

---

### 1.8 `learning_session_transition`

| Field | Value |
|---|---|
| **Category** | **Strict RLS** |
| **Why** | Supporting Persistence Entity ([DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md)); 1-hop via `learning_session`. Append-only companion log (DECISION-045 — no History Table on `learning_session`). Audit-only semantics: SELECT + service INSERT only, never UPDATE. |
| **Owner** | Learning Session Module — LearningSessionOrchestrationService |
| **Readers** | Owning Learner (**confirmed Frontend direct-read exception** per API Architecture) |
| **Writers** | LearningSessionOrchestrationService only (append-only) |

---

## 2. Round 2 — Knowledge / Evidence / Assessment / Traceability (7 tables)

### 2.1 `knowledge_node`

| Field | Value |
|---|---|
| **Category** | **Shared Access** |
| **Why** | Global reusable knowledge unit — not owned by any Learner ([DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md) mục 4). First Shared table in schema; RLS is role-based, not ownership-based. |
| **Owner** | Knowledge Graph Module — KnowledgeExpansionService |
| **Readers** | All authenticated Learners |
| **Writers** | KnowledgeExpansionService only (AI-driven expansion, D4/D5) |

---

### 2.2 `knowledge_edge`

| Field | Value |
|---|---|
| **Category** | **Shared Access** |
| **Why** | Global DAG edges; same visibility model as `knowledge_node`. Immutable append-only (DECISION-025). |
| **Owner** | Knowledge Graph Module — KnowledgeExpansionService |
| **Readers** | All authenticated Learners |
| **Writers** | KnowledgeExpansionService only |

---

### 2.3 `knowledge_node_mastery`

| Field | Value |
|---|---|
| **Category** | **Strict RLS** |
| **Why** | Direct `learner_id`; personalised mastery projection. Write-owner is Assessment Module (DECISION-026), not Knowledge Graph — classification follows **visibility**, not naming. |
| **Owner** | Assessment Module — AssessmentService |
| **Readers** | Owning Learner only |
| **Writers** | AssessmentService only |

---

### 2.4 `evidence`

| Field | Value |
|---|---|
| **Category** | **Strict RLS** |
| **Why** | Direct `learner_id`; raw learner submissions/responses — **highest sensitivity** Learner-owned data ([RLS_BOUNDARY_MATRIX.md](RLS_BOUNDARY_MATRIX.md) mục 2 #1). |
| **Owner** | Evidence Module — EvidenceCaptureService |
| **Readers** | Owning Learner (**confirmed Frontend direct-read exception**) |
| **Writers** | EvidenceCaptureService only (immutable append-only) |

---

### 2.5 `evidence_link`

| Field | Value |
|---|---|
| **Category** | **Strict RLS** |
| **Why** | 1-hop via `evidence.learner_id`; links learner evidence to shared KnowledgeNodes with stance/weight. |
| **Owner** | Evidence Module — EvidenceCaptureService |
| **Readers** | Owning Learner (**confirmed Frontend direct-read exception**) |
| **Writers** | EvidenceCaptureService only (immutable append-only) |

---

### 2.6 `assessment_result`

| Field | Value |
|---|---|
| **Category** | **Strict RLS** |
| **Why** | Direct `learner_id`; primary explainability artifact for Assessment (DECISION-030). Contains `reasoning` — sensitive personalised AI evaluation. |
| **Owner** | Assessment Module — AssessmentService |
| **Readers** | Owning Learner |
| **Writers** | AssessmentService only (immutable append-only) |

---

### 2.7 `trace_link`

| Field | Value |
|---|---|
| **Category** | **Never Exposed** |
| **Why** | Polymorphic cross-cutting explainability infrastructure (DECISION-038). No `learner_id`; no single `USING` clause covers all `source_type`/`target_type` combinations. Learner reads provenance via Read Models that JOIN at Application layer — never raw `trace_link` ([DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) requires traceability, not direct table exposure). |
| **Owner** | Explainability Module — ExplainabilityService |
| **Readers** | None at client/RLS layer; Backend Read Models only |
| **Writers** | ExplainabilityService only (immutable append-only) |

---

## 3. Round 3 — Cross-Module Closure (2 tables)

### 3.1 `roadmap_node_knowledge_node`

| Field | Value |
|---|---|
| **Category** | **Strict RLS** |
| **Why** | Dependency Edge M:N bridge; Learner-owned via 3-hop chain (`roadmap_node` → `roadmap` → `goal` → `learner_id`). Deepest ownership path in entire schema ([DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md) mục 5). |
| **Owner** | Goal & Roadmap Module — RoadmapMappingService (D6) |
| **Readers** | Owning Learner |
| **Writers** | RoadmapMappingService only (`removed_at` soft-remove via governance) |

---

### 3.2 `expansion_record`

| Field | Value |
|---|---|
| **Category** | **Shared Access** |
| **Why** | Deep/Structural expansion audit on global Knowledge Graph (DECISION-023). `expansion_reason` is shared knowledge rationale, not Learner-private behaviour. |
| **Owner** | Knowledge Graph Module — KnowledgeExpansionService |
| **Readers** | All authenticated Learners (when viewing relevant node context) |
| **Writers** | KnowledgeExpansionService only (immutable append-only) |

---

## 4. Summary Matrix

| # | Table | Round | Category | Owner Module | Hop depth |
|---|---|---|---|---|---|
| 1 | `learner` | 1 | Strict RLS | Identity | 0 |
| 2 | `goal` | 1 | Strict RLS | Goal & Roadmap | 0 |
| 3 | `roadmap` | 1 | Strict RLS | Goal & Roadmap | 1 |
| 4 | `roadmap_node` | 1 | Strict RLS | Goal & Roadmap | 2 |
| 5 | `approval_record` | 1 | Strict RLS | Goal & Roadmap | 0 or 2 |
| 6 | `learning_session` | 1 | Strict RLS | Learning Session | 0 |
| 7 | `sub_session` | 1 | Strict RLS | Learning Session | 1 |
| 8 | `learning_session_transition` | 1 | Strict RLS | Learning Session | 1 |
| 9 | `knowledge_node` | 2 | Shared Access | Knowledge Graph | — |
| 10 | `knowledge_edge` | 2 | Shared Access | Knowledge Graph | — |
| 11 | `knowledge_node_mastery` | 2 | Strict RLS | Assessment | 0 |
| 12 | `evidence` | 2 | Strict RLS | Evidence | 0 |
| 13 | `evidence_link` | 2 | Strict RLS | Evidence | 1 |
| 14 | `assessment_result` | 2 | Strict RLS | Assessment | 0 |
| 15 | `trace_link` | 2 | Never Exposed | Explainability | N/A |
| 16 | `roadmap_node_knowledge_node` | 3 | Strict RLS | Goal & Roadmap | 3 |
| 17 | `expansion_record` | 3 | Shared Access | Knowledge Graph | — |

### Counts

| Category | Count | Tables |
|---|---|---|
| **Strict RLS** | 13 | All Learner-owned tables above |
| **Shared Access** | 3 | `knowledge_node`, `knowledge_edge`, `expansion_record` |
| **Service Only** | 0 *(among DDL R1–3 tables)* | Future: `history.*` trigger tables ([DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md)) |
| **Never Exposed** | 1 | `trace_link` (+ Decision Header when mechanism exists) |

---

## 5. Related Tables Not Yet DDL (Round 4+ — reference only)

These are **not** in scope for policy SQL yet but inherit the same classification pattern when DDL arrives:

| Entity (expected) | Expected category |
|---|---|
| `mentor_session` | Strict RLS |
| `discovery_session` | Strict RLS |
| `self_assessment_mismatch` | Strict RLS |
| `recommendation_proposal` | Strict RLS |
| Decision Header (pending) | Never Exposed |
| `history.learner`, `history.knowledge_node` | Service Only / System Only |

---

## Liên kết ngược

[POLICY_COMPLEXITY_MATRIX.md](POLICY_COMPLEXITY_MATRIX.md), [ACCESS_PATH_ANALYSIS.md](ACCESS_PATH_ANALYSIS.md), [RLS_RISK_REVIEW.md](RLS_RISK_REVIEW.md), [POLICY_AUTHORING_PREPARATION.md](POLICY_AUTHORING_PREPARATION.md), [RLS_POLICY_STRATEGY.md](RLS_POLICY_STRATEGY.md), [BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md).
