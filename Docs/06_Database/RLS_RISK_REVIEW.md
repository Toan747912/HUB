# RLS Risk Review — Supabase Policy Preparation

> **⛔ SUPERSEDED (2026-07-02):** This document describes a Postgres/Supabase RLS architecture that was never implemented. [DECISION-058](../11_Decisions/DECISION-058-MongoDB-Canonical-Persistence-Store.md) establishes MongoDB as the canonical persistence platform, with access control enforced entirely in the NestJS application layer (JWT + RBAC) instead of database-level row security. Retained for historical record only — do not use as current architecture guidance.


> **Round:** Supabase Policy Preparation Review.  
> **Scope:** Policy design risks for all 17 DDL Round 1–3 tables + cross-cutting architecture.  
> **No SQL. Architecture review only.**

---

## 0. Risk Categories

| Category | Definition |
|---|---|
| **Data leakage** | Learner A reads/writes Learner B's rows |
| **Ownership confusion** | Policy checks wrong FK chain or conflates Shared vs Learner-owned |
| **Service-role abuse** | Bug or misuse under `service_role` bypass causes cross-tenant or unauthorized mutation |
| **Shared knowledge risks** | Unintended exposure or mutation of global Knowledge Graph |
| **Explainability risks** | Broken traceability, raw trace exposure, or DECISION-048 violations |

**Severity:** Critical > High > Medium > Low

---

## 1. Data Leakage Risks

| ID | Risk | Severity | Affected tables | Mitigation (design) |
|---|---|---|---|---|
| DL-01 | **3-hop policy bug** exposes all Dependency Edges | **Critical** | `roadmap_node_knowledge_node` | Test EXISTS chain end-to-end; consider `learner_id` denormalization on Roadmap branch |
| DL-02 | **2-hop policy bug** on Roadmap subtree | **High** | `roadmap_node`, `approval_record` | Separate policy review for Roadmap module; never copy-paste wrong parent FK |
| DL-03 | **`approval_record` OR path** — only approver path implemented, owner locked out (or vice versa) | **High** | `approval_record` | Both paths required in single policy OR expression |
| DL-04 | **Confuse Shared with Learner-owned** — apply `auth.uid()` to `knowledge_node` | **High** | `knowledge_node`, `knowledge_edge`, `expansion_record` | Use Shared template (authenticated read all), never ownership template |
| DL-05 | **Direct Frontend read exception expanded** beyond 3 tables | **Medium** | `evidence`, `evidence_link`, `learning_session_transition` | Freeze exception list in API Architecture; code review on new Supabase client calls |
| DL-06 | **Admin cross-Learner read** scope undefined | **Medium** | All Strict RLS | Decision required before Admin support tooling; Backend authorization, not RLS |
| DL-07 | **`evidence_link` 1-hop miss** — join to wrong evidence | **High** | `evidence_link` | Policy must reference `evidence_id` → `evidence.learner_id` |

---

## 2. Ownership Confusion Risks

| ID | Risk | Severity | Affected tables | Mitigation (design) |
|---|---|---|---|---|
| OC-01 | **`knowledge_node_mastery` assigned to Knowledge Graph Module** in policy docs | **High** | `knowledge_node_mastery` | Write-owner = AssessmentService (DECISION-026); RLS follows `learner_id`, not module name |
| OC-02 | **`roadmap_node_knowledge_node` write-owner confusion** — Knowledge Graph writes Dependency Edge | **High** | `roadmap_node_knowledge_node` | Goal & Roadmap Module owns table; Knowledge Graph read-only |
| OC-03 | **`trace_link` treated as Learner-owned** | **Critical** | `trace_link` | Never Exposed — no `learner_id` policy attempt |
| OC-04 | **Denormalized `learner_id` drift** if added later without sync trigger | **Medium** | `roadmap`, `roadmap_node`, `roadmap_node_knowledge_node` | If denormalizing: trigger-maintained consistency or accept as deliberate trade-off with tests |
| OC-05 | **`sub_session.knowledge_node_id` placeholder FK** — policy before FK exists | **Low** | `sub_session` | Complete FK in DDL finalization before production policies |
| OC-06 | **Dual "session" terminology** — Auth session vs `learning_session` | **Low** | `learning_session` | Naming discipline in code/docs ([SUPABASE_AUTH_ALIGNMENT.md](SUPABASE_AUTH_ALIGNMENT.md) mục 4) |

---

## 3. Service-Role Abuse Risks

| ID | Risk | Severity | Affected tables | Mitigation (design) |
|---|---|---|---|---|
| SR-01 | **RLS cannot distinguish Backend Modules** — any service bug writes wrong `learner_id` | **Critical** | All tables | Module boundary tests; never assume RLS protects service_role writes |
| SR-02 | **AssessmentService writes another Learner's mastery** | **Critical** | `knowledge_node_mastery`, `assessment_result` | Code review + integration tests on `learner_id` propagation from Evidence events |
| SR-03 | **Non-Explainability Module writes `trace_link`** | **Critical** | `trace_link` | Internal authorization on ExplainabilityService; no public route |
| SR-04 | **Cloud AI holds `service_role` key** | **Critical** | All | Deployment secret isolation; never pass Supabase creds to AI provider |
| SR-05 | **Learner JWT used on Backend but service_role writes without re-validating ownership** | **High** | All Command paths | Backend must bind Command to authenticated `learner_id`, not trust client body |
| SR-06 | **KnowledgeExpansionService writes without audit** | **Medium** | `knowledge_node`, `knowledge_edge`, `expansion_record` | Require `expansion_record` for Deep/Structural (Application invariant — no DB FK) |
| SR-07 | **`service_role` key rotation/lifecycle undefined** | **Medium** | All | Infrastructure Decision before production |

### Tables most dangerous under `service_role`

| Rank | Table | Why |
|---|---|---|
| 1 | `knowledge_node_mastery` | Single write-owner; wrong update affects learner progress permanently |
| 2 | `assessment_result` | Immutable explainability artifact; wrong insert corrupts trust chain |
| 3 | `trace_link` | Polymorphic; no FK integrity; wrong link breaks DECISION-048 |
| 4 | `evidence` | Raw learner content; bulk export if service bug |
| 5 | `roadmap_node` / `roadmap_node_knowledge_node` | Structural changes affect entire learning path |

---

## 4. Shared Knowledge Risks

| ID | Risk | Severity | Affected tables | Mitigation (design) |
|---|---|---|---|---|
| SK-01 | **Authenticated INSERT on Shared tables** — Learner pollutes global graph | **Critical** | `knowledge_node`, `knowledge_edge` | No INSERT/UPDATE policies for `authenticated`; write service_role only |
| SK-02 | **Treating global graph read as "data leak"** — false positive in security review | **Low** | Shared trio | Document intentional: all Learners see same Knowledge Graph |
| SK-03 | **`expansion_record.expansion_reason` visible to all** — intentional per DECISION-023 | **Low** | `expansion_record` | Not a bug; Deep/Structural must display reason to Learner |
| SK-04 | **Local Expansion (D5) without row** — no RLS row to protect | **Medium** | N/A (no table) | Application log only; different from Shared table risk |
| SK-05 | **Duplicate/malicious node creation via compromised service_role** | **High** | `knowledge_node`, `knowledge_edge` | Module boundary + operational monitoring; RLS cannot help post-compromise |

---

## 5. Explainability Risks

| ID | Risk | Severity | Affected tables | Mitigation (design) |
|---|---|---|---|---|
| EX-01 | **`trace_link` SELECT policy added "for debugging"** | **Critical** | `trace_link` | Never Exposed — permanent ban on authenticated policies |
| EX-02 | **`assessment_result` without accompanying `trace_link`** | **High** | `assessment_result`, `trace_link` | Same-transaction invariant in AssessmentService (Application Layer — no DB CHECK) |
| EX-03 | **Deep/Structural expansion without `expansion_record`** | **High** | `expansion_record`, `knowledge_edge` | Application invariant ([DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md) Risk #4) |
| EX-04 | **D6/D1/D7/D9 reasoning gaps (GAP-01/05)** — DECISION-048 requires explainability but no persistence column yet | **High** | `roadmap_node_knowledge_node`, others | Policy prep does not fix; track as pre-production blocker for affected Decision Types |
| EX-05 | **D8 Runtime Reconstruction inputs not verified** | **Medium** | `mentor_session` (future) | Cannot finalize Mentor policies until D8 inputs confirmed |
| EX-06 | **`ExpansionRecord` ↔ `KnowledgeEdge` no FK** — cannot DB-verify edge provenance | **Medium** | `expansion_record`, `knowledge_edge` | Application tests; optional future FK if cardinality decided |
| EX-07 | **Learner sees chain-of-thought vs traceability confusion** | **Low** | `assessment_result.reasoning` | DECISION-048 Out Of Scope — reasoning field is trace summary, not full CoT |

---

## 6. Consolidated Risk Register (ranked)

| Rank | ID | Severity | Summary |
|---|---|---|---|
| 1 | SR-04 | **Critical** | Cloud AI with Supabase credentials |
| 2 | SR-01 | **Critical** | Assuming RLS protects service_role |
| 3 | OC-03 / EX-01 | **Critical** | Exposing `trace_link` to clients |
| 4 | DL-01 | **Critical** | 3-hop policy failure on Dependency Edge |
| 5 | SK-01 | **Critical** | Client write to Shared Knowledge Graph |
| 6 | SR-02 | **Critical** | Wrong-learner Assessment writes |
| 7 | SR-03 | **Critical** | Unauthorized `trace_link` writes |
| 8 | EX-02 | **High** | Assessment without trace_link |
| 9 | DL-02 / DL-07 | **High** | Roadmap/Evidence hop errors |
| 10 | EX-04 | **High** | DECISION-048 gaps without persistence |

---

## 7. Cross-Check: DECISION-043 / 045 / 047 / 048

| Decision | Risk if violated | Status |
|---|---|---|
| **DECISION-043** | Mapping table would force JOIN on every policy — performance + bug surface | ✅ Avoided — direct `auth.uid()` on 6 tables |
| **DECISION-045** | Duplicate history on `learning_session` if History Table added | ✅ `learning_session_transition` is companion log — Strict RLS, append-only |
| **DECISION-047** | Transition log exposed to wrong Learner or writable by client | ⚠️ Policy must be SELECT-only for authenticated; INSERT service only |
| **DECISION-048** | Raw `trace_link` exposure or missing traces | ⚠️ Never Exposed + Application invariants — gaps remain for D1/D6/D7/D9 |

---

## Liên kết ngược

[TABLE_SECURITY_CLASSIFICATION.md](TABLE_SECURITY_CLASSIFICATION.md), [POLICY_COMPLEXITY_MATRIX.md](POLICY_COMPLEXITY_MATRIX.md), [ACCESS_PATH_ANALYSIS.md](ACCESS_PATH_ANALYSIS.md), [POLICY_AUTHORING_PREPARATION.md](POLICY_AUTHORING_PREPARATION.md), [RLS_READINESS_ASSESSMENT.md](RLS_READINESS_ASSESSMENT.md).
