# Policy Authoring Preparation — Supabase Policy Preparation

> **Round:** Supabase Policy Preparation Review.  
> **Scope:** Design-only preparation for SQL policy authoring — **no SQL, no `CREATE POLICY`**.  
> **Sources:** [RLS_POLICY_STRATEGY.md](RLS_POLICY_STRATEGY.md), [BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md), [TABLE_SECURITY_CLASSIFICATION.md](TABLE_SECURITY_CLASSIFICATION.md), [POLICY_COMPLEXITY_MATRIX.md](POLICY_COMPLEXITY_MATRIX.md).

---

## 1. Policy Groups

Policies should be authored in **groups** matching Module boundaries and RLS category — not one monolithic migration.

| Group | ID | Tables | Category | Primary policies |
|---|---|---|---|---|
| **G1 — Identity** | identity | `learner` | Strict RLS | SELECT own row |
| **G2 — Goal & Roadmap** | goal_roadmap | `goal`, `roadmap`, `roadmap_node`, `approval_record`, `roadmap_node_knowledge_node` | Strict RLS | SELECT via ownership chain |
| **G3 — Learning Session** | learning_session | `learning_session`, `sub_session`, `learning_session_transition` | Strict RLS | SELECT via chain; transition append-only |
| **G4 — Shared Knowledge** | shared_knowledge | `knowledge_node`, `knowledge_edge`, `expansion_record` | Shared Access | SELECT all authenticated |
| **G5 — Evidence** | evidence | `evidence`, `evidence_link` | Strict RLS | SELECT own (+ Frontend exception) |
| **G6 — Assessment** | assessment | `knowledge_node_mastery`, `assessment_result` | Strict RLS | SELECT own |
| **G7 — Explainability** | explainability | `trace_link` | Never Exposed | Enable RLS; **zero** authenticated policies |

**Authoring order recommendation:** G1 → G4 (simple Shared pattern) → G5/G6 (0-hop templates) → G3 → G2 (increasing hop depth) → G7 last (explicit deny-by-default verification).

---

## 2. Ownership Rules

### 2.1 Global ownership model

Single model for entire schema ([DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md)):

```
auth.uid() = learner.id = learner_id on all Learner-owned rows (direct or derived)
```

No `tenant_id`, no organisation scope, no secondary mapping table.

### 2.2 Ownership resolution by hop count

| Hops | Pattern | Tables |
|---|---|---|
| 0 | Column = `auth.uid()` | `learner`, `goal`, `learning_session`, `knowledge_node_mastery`, `evidence`, `assessment_result` |
| 1 | EXISTS parent.learner_id | `roadmap`, `sub_session`, `learning_session_transition`, `evidence_link` |
| 2 | EXISTS grandparent chain | `roadmap_node`, `approval_record` (path B) |
| 0 OR 2 | OR composition | `approval_record` (also `approved_by_learner_id`) |
| 3 | EXISTS three-level chain | `roadmap_node_knowledge_node` |
| — | No ownership | Shared trio; `trace_link` |

### 2.3 Write ownership (Application Layer — not RLS)

RLS does **not** enforce which Module writes. Code must enforce:

| Module | Exclusive write tables |
|---|---|
| AccountLifecycleService | `learner` |
| RoadmapMappingService | `goal`, `roadmap`, `roadmap_node`, `approval_record`, `roadmap_node_knowledge_node` |
| LearningSessionOrchestrationService | `learning_session`, `sub_session`, `learning_session_transition` |
| KnowledgeExpansionService | `knowledge_node`, `knowledge_edge`, `expansion_record` |
| EvidenceCaptureService | `evidence`, `evidence_link` |
| AssessmentService | `knowledge_node_mastery`, `assessment_result` |
| ExplainabilityService | `trace_link` |

---

## 3. Service Access Rules

### 3.1 Supabase platform truth

- **`service_role` bypasses RLS entirely** — do not write policies "for service_role"
- All Backend writes use `service_role`; authorization is **Module boundary in code**

### 3.2 Rules per actor (Postgres roles)

| Postgres role | Read | Write |
|---|---|---|
| `authenticated` | Per Strict/Shared policies; never `trace_link` | **No** business writes (Commands via Backend) |
| `service_role` | Unrestricted (bypass) | All business writes via Application Services |
| `anon` | Deny all business tables | Deny all |

### 3.3 Internal service authorization (code-level, mandatory)

Because RLS cannot distinguish services under shared `service_role`:

| Service | Must enforce |
|---|---|
| ExplainabilityService | Only 4 Core Modules may call; append-only `trace_link` |
| DecisionPersistenceService | Separate from Explainability; Header when exists |
| AssessmentService | Sole writer of `knowledge_node_mastery` |
| KnowledgeExpansionService | Deep/Structural requires `expansion_record` same transaction |
| AccountLifecycleService | Sole setter of `anonymized_at` |

---

## 4. Admin Access Rules

| Rule | Detail |
|---|---|
| **No Supabase Admin role** | Admin uses `Apps/admin` → Backend |
| **Cross-Learner read** | Backend authorization — scope **pending Decision** |
| **Cross-Learner write** | Denied unless future explicit Decision |
| **RLS policies** | Admin does **not** get special Postgres policies — Backend uses service_role with its own checks |
| **Debug access to `trace_link`** | Via Read Models only, never raw PostgREST |

---

## 5. Shared Resource Rules

For `knowledge_node`, `knowledge_edge`, `expansion_record`:

| Rule | Implementation intent |
|---|---|
| Read | Any `authenticated` user — `USING (true)` or role grant equivalent |
| Write | No policy for `authenticated` — implicit deny |
| Delete | Never (immutable / RESTRICT FKs) |
| Visibility | Intentional global read — not a leakage bug |
| Expansion reason | `expansion_record.expansion_reason` readable by all — DECISION-023 |

**Anti-pattern:** Applying `learner_id = auth.uid()` to Shared tables — would block all reads or over-restrict incorrectly.

---

## 6. Policy Templates vs Custom Logic

### 6.1 Templatable policies (reuse across tables)

| Template | Name | Parameters | Applies to |
|---|---|---|---|
| **T1** | `strict_direct_select` | `{table}`, `{owner_column}` | 6 tables (see POLICY_COMPLEXITY_MATRIX) |
| **T2** | `strict_one_hop_select` | `{table}`, `{parent}`, `{fk}` | 4 tables |
| **T3** | `strict_two_hop_select` | `{table}`, chain spec | `roadmap_node` |
| **T4** | `shared_authenticated_select` | `{table}` | 3 Shared tables |
| **T5** | `never_exposed_enable_only` | `{table}` | `trace_link` |

### 6.2 Custom logic required

| Table | Why custom |
|---|---|
| **`approval_record`** | Dual-path OR: `approved_by_learner_id = auth.uid()` OR 2-hop roadmap owner |
| **`roadmap_node_knowledge_node`** | 3-hop chain — extend T3 or denormalize first |
| **`trace_link`** | No SELECT policy — verify deny-by-default; document in migration comments |
| **`learning_session_transition`** | Append-only semantics — no UPDATE/DELETE policies for any role except service bypass |

### 6.3 Templates NOT to reuse across categories

| Wrong reuse | Consequence |
|---|---|
| T1 on Shared tables | Blocks all Learners from Knowledge Graph |
| T4 on `evidence` | Exposes all Learners' evidence to everyone |
| T1 on `trace_link` | Cannot express polymorphic ownership |

---

## 7. Append-Only and Audit Tables

Tables with **SELECT only** for `authenticated`, never UPDATE:

`goal`, `approval_record`, `learning_session_transition`, `evidence`, `evidence_link`, `assessment_result`, `knowledge_edge`, `expansion_record`, `trace_link`

Authoring note: absence of UPDATE policy + RLS enabled = deny UPDATE for `authenticated`. service_role bypass still allows service writes on insert-only tables.

---

## 8. Cross-Check Summary

### 8.1 DECISION-043 (Auth Alignment)

| Check | Result |
|---|---|
| `learner.id = auth.users.id` enables 0-hop policies | ✅ |
| No mapping JOIN on every table | ✅ |
| `ON DELETE RESTRICT` + Anonymization before auth delete | ✅ Policy prep aligns; Application workflow required |

### 8.2 DECISION-045 (Temporal Strategy)

| Check | Result |
|---|---|
| `learning_session_transition` as companion log — Strict RLS, not History Table | ✅ |
| Future `history.*` tables — Service Only, separate policy group when DDL exists | ✅ Planned |

### 8.3 DECISION-047 (Transition Log)

| Check | Result |
|---|---|
| Supporting entity — SELECT for owner, INSERT service only | ✅ |
| Frontend direct-read exception documented | ✅ |

### 8.4 DECISION-048 (All AI Decisions Explainable)

| Check | Result |
|---|---|
| `trace_link` Never Exposed | ✅ |
| `assessment_result` Strict RLS — reasoning protected | ✅ |
| `expansion_record` Shared — reason visible per DECISION-023 | ✅ |
| GAP-01/05 — D1/D6/D7/D9 persistence not in schema yet | ⚠️ Open — policy authoring can proceed; Application gaps remain |

### 8.5 Backend Module Architecture

| Check | Result |
|---|---|
| One write-owner per table | ✅ No conflicts |
| Explainability internal auth required | ✅ Documented |
| Mentor → Evidence sync write | ✅ RLS invisible to this — Module concern |

### 8.6 API Architecture

| Check | Result |
|---|---|
| Frontend direct-read list unchanged (3 + Shared) | ✅ |
| All Commands via Backend | ✅ |
| Cloud AI no DB access | ✅ |

**No ownership conflicts. No security conflicts. No explainability violations in policy *design* — Application-layer explainability gaps remain pre-existing.**

---

## 9. Mandatory Questions

**1. Which tables require Strict RLS?**  
`learner`, `goal`, `roadmap`, `roadmap_node`, `approval_record`, `learning_session`, `sub_session`, `learning_session_transition`, `knowledge_node_mastery`, `evidence`, `evidence_link`, `assessment_result`, `roadmap_node_knowledge_node` — **13 tables**.

**2. Which tables can use Shared Access?**  
`knowledge_node`, `knowledge_edge`, `expansion_record` — **3 tables**.

**3. Which tables must never be exposed?**  
`trace_link` (plus Decision Header when mechanism exists; `auth.users` is Supabase-managed, not Backend RLS scope).

**4. Which tables are Service Only?**  
Among DDL R1–3: **`trace_link`** for all client operations. All **writes** on every table are Service Only (via Backend). Future **`history.*`** tables (DECISION-045) will be Service/System Only.

**5. Which tables have the most complex ownership?**  
`roadmap_node_knowledge_node` (3-hop); then `approval_record` (dual OR + 2-hop); then `roadmap_node` (2-hop).

**6. Which tables require multi-hop ownership checks?**  
`roadmap` (1), `roadmap_node` (2), `approval_record` (2), `sub_session` (1), `learning_session_transition` (1), `evidence_link` (1), `roadmap_node_knowledge_node` (3).

**7. Which tables are dangerous under service_role?**  
`knowledge_node_mastery`, `assessment_result`, `trace_link`, `evidence`, `roadmap_node`, `roadmap_node_knowledge_node` — any write bug bypasses RLS.

**8. Which tables should never be queried directly by Frontend?**  
**Hard ban:** `trace_link`. **Recommended Backend-only read:** all other Strict RLS tables except the three Frontend read exceptions (`evidence`, `evidence_link`, `learning_session_transition`). Shared tables **should** be read directly.

**9. Which tables need custom policies?**  
`approval_record`, `roadmap_node_knowledge_node`, `trace_link`, `learning_session_transition` (append-only constraint emphasis).

**10. Which tables can reuse templates?**  
T1: 6 tables; T2: 4 tables; T3: 1 table (`roadmap_node`); T4: 3 Shared tables; T5: 1 table (`trace_link`). **14/17** largely templatable.

**11. What are the highest-risk policy mistakes?**  
(a) Believing RLS restricts service_role Module behavior; (b) disabling RLS on deep-hop Roadmap tables for performance; (c) adding SELECT on `trace_link` for debugging; (d) applying Shared template to `evidence` or Strict template to `knowledge_node`.

**12. What policy design pattern should be used most often?**  
**Strict RLS — direct `learner_id = auth.uid()` (T1)** — applies to 6 of 13 Strict tables and is the default for all future Round 4+ Learner-owned roots.

**13. Is the schema ready for policy authoring?**  
**Yes, with conditions** — all 17 tables classified; patterns defined; 4 Round 4+ tables and Decision Header excluded. Conditions: confirm service_role limits understood; decide denormalization optional; Admin scope Decision pending.

**14. Is the schema ready for DDL finalization?**  
**Partially (~40%)** — RLS prep does not block DDL for R1–3 tables, but pre-existing gaps remain: GAP-01/02/05, Open Questions on content taxonomy, `mentor_session` FK on `evidence`, ExpansionRecord↔KnowledgeEdge cardinality, optional `learner_id` denormalization decision.

**15. What unresolved risks remain?**  
Admin cross-Learner scope; Cloud AI credential isolation at deploy; service_role secret lifecycle; denormalize vs 3-hop JOIN; explainability persistence gaps (D1/D6/D7/D9); D8 Runtime Reconstruction unverified; 4 tables not yet DDL; Decision Header mechanism pending; Application-layer invariants (`trace_link` ≥1 per assessment, expansion_record for Deep/Structural) not DB-enforced.

---

## POLICY_PREPARATION_READINESS_ASSESSMENT

| Dimension | Score | Status | Notes |
|---|---|---|---|
| **Policy Authoring** | **~70/100** | **Ready to begin SQL for 16/17 tables** | All patterns specified; `trace_link` is trivial deny-all. Round 4+ tables await DDL. Founder should confirm service_role architectural limits before first migration merges. |
| **DDL Finalization** | **~42/100** | **Not blocked by policy prep** | Policy review confirms no new columns required for RLS (denormalization optional). Unrelated schema gaps still open. |
| **Backend Implementation** | **~58/100** | **Policy design aligns; code auth gaps remain** | ExplainabilityService and DecisionPersistenceService internal authorization is a **hard requirement** — RLS will not compensate. Module write-ownership map is complete for R1–3. |
| **Production Deployment** | **~18/100** | **Not ready** | Cloud AI credential isolation, service_role rotation, Admin authorization, and explainability gap closure must precede production. RLS policies are necessary but not sufficient for production security. |

### Readiness verdict

| Gate | Verdict |
|---|---|
| Begin policy **design** documentation | ✅ Complete (this round) |
| Begin policy **SQL authoring** for DDL R1–3 | ✅ Approved with conditions listed in Q13 |
| Finalize DDL | ⚠️ Independent track — policy prep adds no blockers |
| Ship Backend | ❌ Internal service auth + Round 4 DDL required |
| Production | ❌ Deployment security + explainability gaps |

### Conditions before first `CREATE POLICY` migration

1. Lead Architect acknowledges **RLS does not constrain service_role Module behavior** (SR-01).
2. Optional: decide **`learner_id` denormalization** on Roadmap branch before writing 2-hop/3-hop policies (avoids rewrite).
3. Freeze **Frontend direct-read exception list** — no expansion without API Architecture revision.
4. Document **`trace_link` permanent deny** in team runbook — no debug exceptions.

---

## Liên kết ngược

[TABLE_SECURITY_CLASSIFICATION.md](TABLE_SECURITY_CLASSIFICATION.md), [POLICY_COMPLEXITY_MATRIX.md](POLICY_COMPLEXITY_MATRIX.md), [ACCESS_PATH_ANALYSIS.md](ACCESS_PATH_ANALYSIS.md), [RLS_RISK_REVIEW.md](RLS_RISK_REVIEW.md), [RLS_POLICY_STRATEGY.md](RLS_POLICY_STRATEGY.md), [RLS_READINESS_ASSESSMENT.md](RLS_READINESS_ASSESSMENT.md), [BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md), [SUPABASE_AUTH_ALIGNMENT.md](SUPABASE_AUTH_ALIGNMENT.md).
