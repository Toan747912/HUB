# RLS Policy Strategy — AI Mentor OS

> **⛔ SUPERSEDED (2026-07-02):** This document describes a Postgres/Supabase RLS architecture that was never implemented. [DECISION-058](../11_Decisions/DECISION-058-MongoDB-Canonical-Persistence-Store.md) establishes MongoDB as the canonical persistence platform, with access control enforced entirely in the NestJS application layer (JWT + RBAC) instead of database-level row security. Retained for historical record only — do not use as current architecture guidance.


> Phạm vi: Task 5 — chiến lược Policy theo Module, **không viết SQL**. Kế thừa [BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md) (Module → bảng), [RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md), [RLS_ACTOR_MODEL.md](RLS_ACTOR_MODEL.md) mục 0 (service_role bypass).

---

## 0. Chiến lược tổng quát (áp dụng cho mọi Module)

1. **`authenticated` chỉ có SELECT, gần như không có INSERT/UPDATE trực tiếp** — vì mọi Command đi qua Backend (service_role), Policy INSERT/UPDATE cho `authenticated` chỉ cần tồn tại cho **đúng tập bảng đã xác nhận Frontend được viết trực tiếp** ([SUPABASE_AUTH_ALIGNMENT.md](SUPABASE_AUTH_ALIGNMENT.md) mục 6 Q8) — hiện tại là **0 bảng** (cả 2 ví dụ đọc trực tiếp ở Round API đều chỉ là Read-only).
2. **`service_role` luôn bypass RLS** — không viết Policy "cho service_role" vì không cần; thay vào đó, ranh giới thật nằm ở **Module boundary trong code** (đã chốt ở Backend Module Architecture Round), RLS không gánh việc này.
3. **Mọi bảng Learner-owned dùng đúng 1 trong 2 pattern đã có sẵn từ DDL Round 1-3:** (a) `learner_id = auth.uid()` trực tiếp (0 hop), hoặc (b) `EXISTS (SELECT 1 FROM <parent> WHERE ... learner_id = auth.uid())` (N hop) — không phát sinh pattern thứ 3.
4. **Mọi bảng Shared dùng pattern role-based:** `SELECT` cho `authenticated`, không `learner_id` nào trong policy.
5. **Bảng Explainability-only không có Policy cho `authenticated`** — SELECT cũng không, vì không có lý do nghiệp vụ nào Learner cần SELECT trực tiếp `trace_link`/Decision Header (đọc gián tiếp qua Read Model của Module sở hữu Detail).

---

## 1. Chiến lược theo Module

### 1.1 Identity Module

| Thuộc tính | Giá trị |
|---|---|
| **Ownership Rule** | `learner.id = auth.uid()` |
| **Access Rule** | `authenticated`: SELECT own row. `service_role`: bypass (Anonymization qua AccountLifecycleService) |
| **Service Rule** | Chỉ AccountLifecycleService được set `anonymized_at` |
| **Cần Strict RLS?** | **Có** — đây là bảng gốc của mọi ownership chain, sai ở đây lan ra toàn schema |

### 1.2 Goal & Roadmap Module

| Thuộc tính | Giá trị |
|---|---|
| **Ownership Rule** | `goal.learner_id = auth.uid()` (gốc); `roadmap`/`roadmap_node`/`approval_record`/`roadmap_node_knowledge_node` kế thừa qua FK chain |
| **Access Rule** | `authenticated`: SELECT theo chain (1-3 hop, xem RLS_RESOURCE_CLASSIFICATION mục 1) |
| **Service Rule** | Chỉ RoadmapMappingService ghi; `approval_record` có 2 đường đọc (chủ Roadmap + người phê duyệt trực tiếp) |
| **Cần Strict RLS?** | **Có**, đặc biệt `roadmap_node_knowledge_node` (3-hop) — khuyến nghị đánh giá denormalize `learner_id` trước khi viết Policy thật (đã flag từ DDL Round 1/3, chưa quyết định) |

### 1.3 Knowledge Graph Module

| Thuộc tính | Giá trị |
|---|---|
| **Ownership Rule** | **Không có** — Shared resource |
| **Access Rule** | `authenticated`: SELECT toàn bộ. `service_role`: INSERT/UPDATE (KnowledgeExpansionService) |
| **Service Rule** | Chỉ KnowledgeExpansionService ghi `knowledge_node`/`knowledge_edge`/`expansion_record` |
| **Cần Strict RLS?** | **Không** — dùng Shared Access (role-based, không ownership-based) |

### 1.4 Evidence Module

| Thuộc tính | Giá trị |
|---|---|
| **Ownership Rule** | `evidence.learner_id = auth.uid()` (gốc); `evidence_link` kế thừa qua FK |
| **Access Rule** | `authenticated`: SELECT (đúng 2 bảng đã xác nhận là exception đọc trực tiếp ở Round API) |
| **Service Rule** | Chỉ EvidenceCaptureService ghi |
| **Cần Strict RLS?** | **Có** — dữ liệu nhạy cảm nhất (RLS_BOUNDARY_MATRIX mục 2 #1) |

### 1.5 Assessment Module

| Thuộc tính | Giá trị |
|---|---|
| **Ownership Rule** | `learner_id = auth.uid()` trực tiếp cho cả `knowledge_node_mastery` và `assessment_result` (0 hop) |
| **Access Rule** | `authenticated`: SELECT own row |
| **Service Rule** | Chỉ AssessmentService ghi — write-owner duy nhất `knowledge_node_mastery` (DECISION-026), không Module khác được có Policy INSERT/UPDATE nào cho 2 bảng này dù là service_role context (kỷ luật code, RLS không enforce được điều này) |
| **Cần Strict RLS?** | **Có** — cùng mức độ Evidence |

### 1.6 Discovery Module

| Thuộc tính | Giá trị |
|---|---|
| **Ownership Rule** | Dự kiến `learner_id = auth.uid()` (0 hop) cho `discovery_session`; qua FK cho `self_assessment_mismatch` (chưa DDL) |
| **Access Rule** | `authenticated`: SELECT own row |
| **Service Rule** | Chỉ DiscoveryService ghi |
| **Cần Strict RLS?** | **Có** (dự kiến) — chưa thể xác nhận đầy đủ vì chưa DDL |

### 1.7 Mentor Interaction Module

| Thuộc tính | Giá trị |
|---|---|
| **Ownership Rule** | Dự kiến `learner_id = auth.uid()` (0 hop) cho `mentor_session` |
| **Access Rule** | `authenticated`: SELECT own row, gồm Mode hiện tại |
| **Service Rule** | Chỉ MentorInteractionService ghi `mentor_session`; gọi sync vào Evidence Module (RLS không thấy được lời gọi này — đây là tight coupling đã ghi nhận ở Backend Module Round, không phải vấn đề RLS) |
| **Cần Strict RLS?** | **Có** (dự kiến) |

### 1.8 Recommendation Module

| Thuộc tính | Giá trị |
|---|---|
| **Ownership Rule** | Dự kiến `learner_id = auth.uid()` (0 hop) cho `recommendation_proposal` |
| **Access Rule** | `authenticated`: SELECT own row |
| **Service Rule** | Chỉ RecommendationService ghi; không actor nào (kể cả Learner) có quyền tạo Recommendation theo yêu cầu (DECISION-019) — đây là quy tắc Application, RLS chỉ enforce phần "không ai khác ghi", không enforce được "không được tạo theo yêu cầu" (đó là logic, không phải ownership) |
| **Cần Strict RLS?** | **Có** (dự kiến) |

### 1.9 Learning Session Module

| Thuộc tính | Giá trị |
|---|---|
| **Ownership Rule** | `learning_session.learner_id = auth.uid()` (gốc); `sub_session`/`learning_session_transition` qua FK (1 hop) |
| **Access Rule** | `authenticated`: SELECT theo chain; `learning_session_transition` chỉ SELECT, không bao giờ UPDATE Policy (append-only) |
| **Service Rule** | Chỉ LearningSessionOrchestrationService ghi |
| **Cần Strict RLS?** | **Có** |

### 1.10 Teaching Module

| Thuộc tính | Giá trị |
|---|---|
| **Ownership Rule** | Không áp dụng — Teaching không sở hữu Aggregate/bảng nào |
| **Access Rule** | Không có RLS riêng — Teaching chỉ đọc qua Read Model của 5 Module khác |
| **Service Rule** | Không áp dụng |
| **Cần Strict RLS?** | **Không liên quan** — không có bảng để viết Policy |

### 1.11 Explainability Module

| Thuộc tính | Giá trị |
|---|---|
| **Ownership Rule** | Không có ownership Learner — đa hình `source_type`/`target_type` |
| **Access Rule** | **Không Policy nào cho `authenticated`** — 0 quyền Direct, mọi đọc đi qua Read Model của Module sở hữu Detail (đã JOIN sẵn `trace_link` trong Application layer, không phải Learner tự SELECT `trace_link`) |
| **Service Rule** | Chỉ ExplainabilityService ghi |
| **Cần Strict RLS?** | **Never Exposed** — không phải "strict RLS", là **không có Policy cho `authenticated` dưới bất kỳ hình thức nào** |

### 1.12 Decision Persistence Module

| Thuộc tính | Giá trị |
|---|---|
| **Ownership Rule** | Tương tự Explainability — chưa build, nhưng theo nguyên tắc tối giản (không cột `source_*`) |
| **Access Rule** | Giống Explainability Module — **Never Exposed** |
| **Service Rule** | Chỉ DecisionPersistenceService ghi |
| **Cần Strict RLS?** | **Never Exposed** |

### 1.13 Learning Profile Module

| Thuộc tính | Giá trị |
|---|---|
| **Ownership Rule** | Không áp dụng — Projection, không có bảng riêng |
| **Access Rule** | Không có RLS riêng — đọc qua Application layer tổng hợp từ Assessment/Discovery/Goal & Roadmap |
| **Cần Strict RLS?** | **Không liên quan** |

---

## 2. Tổng hợp 3 nhóm bảng (trả lời Task 5 phần Determine)

| Nhóm | Bảng | Chiến lược |
|---|---|---|
| **Cần Strict RLS** (ownership-based, theo `learner_id`) | `learner`, `goal`, `roadmap`, `roadmap_node`, `approval_record`, `learning_session`, `sub_session`, `learning_session_transition`, `knowledge_node_mastery`, `evidence`, `evidence_link`, `assessment_result`, `roadmap_node_knowledge_node`, + 4 bảng chưa DDL (`mentor_session`, `discovery_session`, `self_assessment_mismatch`, `recommendation_proposal`) | `learner_id = auth.uid()` (0 hop) hoặc `EXISTS` qua FK chain (1-3 hop) |
| **Có thể dùng Shared Access** (role-based, không ownership) | `knowledge_node`, `knowledge_edge`, `expansion_record` | `SELECT` cho `authenticated`, write chỉ `service_role` |
| **Không nên bao giờ expose** (Never Exposed) | `trace_link`, Decision Header (pending), `auth.users` (không phải bảng Backend tự quản) | Không Policy `authenticated` nào — toàn bộ qua Backend/Read Model đã tổng hợp |

---

## Liên kết ngược

[RLS_ACTOR_MODEL.md](RLS_ACTOR_MODEL.md), [RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md), [RLS_BOUNDARY_MATRIX.md](RLS_BOUNDARY_MATRIX.md), [SUPABASE_AUTH_ALIGNMENT.md](SUPABASE_AUTH_ALIGNMENT.md), [BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md), [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md), [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md), [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md).
