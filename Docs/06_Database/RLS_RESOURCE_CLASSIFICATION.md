# RLS Resource Classification — AI Mentor OS

> Phạm vi: phân loại 17 bảng đã DDL (Round 1-3) + 4 Aggregate chưa DDL (Round 4+, ghi nhận theo Aggregate Root đã chốt) + 2 cơ chế cross-cutting (TraceLink, Decision Header) theo 6 category đề bài yêu cầu. **Không viết SQL Policy.** Kế thừa trực tiếp "RLS Impact Notes" đã có sẵn ở [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md) mục 4, [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md) mục 4, [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md) mục 5 — tài liệu này **tổng hợp lại có hệ thống**, không phát sinh boundary RLS mới ngoài những gì 3 Round DDL đã ghi nhận.

---

## 0. Định nghĩa 6 Category

| Category | Định nghĩa |
|---|---|
| **Learner-owned** | 1 row gắn chặt với đúng 1 Learner — RLS theo `learner_id = auth.uid()` (trực tiếp hoặc qua JOIN) |
| **Shared** | Dữ liệu dùng chung giữa mọi Learner — RLS không theo ownership, theo role (`authenticated` đọc) |
| **System-owned** | Dữ liệu do hạ tầng quản lý, không thuộc Backend schema trực tiếp (vd `auth.users`) |
| **AI-owned** | Sinh ra từ AI Decision, có thể hiển thị Learner nhưng **không phải Learner tạo ra** — quyền ghi luôn thuộc service_role |
| **Audit-only** | Ghi 1 lần, chỉ đọc lại — không update, không phải nguồn quyết định nghiệp vụ chính |
| **Explainability-only** | Cơ chế cross-cutting cho "vì sao" — không bao giờ Learner ghi, đọc cũng chỉ gián tiếp qua Module khác |

---

## 1. Bảng phân loại đầy đủ

| # | Entity | Category | Owner (Module) | Readers | Writers | Visibility Rule |
|---|---|---|---|---|---|---|
| 1 | `learner` | **Learner-owned** | Identity | Chính Learner đó; Backend (mọi Module, qua `learner_id`) | AccountLifecycleService (Anonymization); Supabase Auth (cho `auth.users` liên kết) | `id = auth.uid()` — 0 hop |
| 2 | `goal` | **Learner-owned** | Goal & Roadmap | Chính Learner đó | RoadmapMappingService | `learner_id = auth.uid()` — 0 hop |
| 3 | `roadmap` | **Learner-owned** | Goal & Roadmap | Chính Learner đó (qua `goal`) | RoadmapMappingService | qua `goal.learner_id` — 1 hop |
| 4 | `roadmap_node` | **Learner-owned** | Goal & Roadmap | Chính Learner đó (qua `roadmap`→`goal`) | RoadmapMappingService | qua `roadmap.goal_id → goal.learner_id` — 2 hop |
| 5 | `approval_record` | **Learner-owned** | Goal & Roadmap | Chính Learner đó (qua `roadmap`→`goal`, hoặc trực tiếp `approved_by_learner_id`) | RoadmapMappingService (đề xuất); Learner (phê duyệt, qua Backend) | 2 đường — `approved_by_learner_id = auth.uid()` (0 hop) HOẶC qua `roadmap.goal_id → goal.learner_id` (2 hop) |
| 6 | `learning_session` | **Learner-owned** | Learning Session | Chính Learner đó | LearningSessionOrchestrationService | `learner_id = auth.uid()` — 0 hop |
| 7 | `sub_session` | **Learner-owned** | Learning Session | Chính Learner đó (qua `learning_session`) | LearningSessionOrchestrationService | qua `learning_session.learner_id` — 1 hop |
| 8 | `learning_session_transition` | **Audit-only** *(đồng thời Learner-owned về phạm vi)* | Learning Session | Chính Learner đó (qua `learning_session`) | LearningSessionOrchestrationService (ghi 1 lần/transition, không update) | qua `learning_session.learner_id` — 1 hop; **không có Update Policy, chỉ Insert + Select** |
| 9 | `knowledge_node` | **Shared** | Knowledge Graph | Mọi Learner đã đăng nhập (`authenticated`) | KnowledgeExpansionService (service_role) | Không theo `learner_id` — role-based, không ownership-based |
| 10 | `knowledge_edge` | **Shared** | Knowledge Graph | Mọi Learner đã đăng nhập | KnowledgeExpansionService (service_role) | Giống `knowledge_node` |
| 11 | `knowledge_node_mastery` | **Learner-owned** | Assessment | Chính Learner đó | AssessmentService | `learner_id = auth.uid()` — 0 hop |
| 12 | `evidence` | **Learner-owned** | Evidence | Chính Learner đó | EvidenceCaptureService | `learner_id = auth.uid()` — 0 hop |
| 13 | `evidence_link` | **Learner-owned** | Evidence | Chính Learner đó (qua `evidence`) | EvidenceCaptureService | qua `evidence.learner_id` — 1 hop |
| 14 | `assessment_result` | **Learner-owned** | Assessment | Chính Learner đó | AssessmentService | `learner_id = auth.uid()` — 0 hop |
| 15 | `trace_link` | **Explainability-only** | Explainability | **Không Learner trực tiếp** — đọc gián tiếp qua Read Model của Module sở hữu Detail (vd AssessmentService JOIN sẵn) | ExplainabilityService (duy nhất) | **Không có pattern `learner_id` đơn giản** (đa hình `source_type`/`target_type`) — khuyến nghị toàn bộ truy cập qua Backend (service_role), không RLS trực tiếp cho Learner |
| 16 | `roadmap_node_knowledge_node` | **Learner-owned** *(qua Roadmap sở hữu)* | Goal & Roadmap | Chính Learner đó (qua `roadmap_node`→`roadmap`→`goal`) | RoadmapMappingService | qua `roadmap_node.roadmap_id → roadmap.goal_id → goal.learner_id` — **3 hop, sâu nhất toàn schema** |
| 17 | `expansion_record` | **Shared** *(AI-owned về nguồn gốc, Shared về visibility)* | Knowledge Graph | Mọi Learner đã đăng nhập (đọc lý do Expansion khi học đúng node liên quan) | KnowledgeExpansionService (service_role) | Không theo `learner_id` — cùng pattern `knowledge_node`/`knowledge_edge` |

### Aggregate chưa DDL (Round 4+, ghi nhận theo write-ownership đã chốt — chưa có cột thật để xác nhận hop count)

| # | Entity (dự kiến) | Category | Owner (Module) | Visibility Rule (dự kiến, chưa chốt) |
|---|---|---|---|---|
| 18 | `mentor_session` | **Learner-owned** | Mentor Interaction | Dự kiến `learner_id = auth.uid()`, 0 hop — theo pattern các Aggregate root khác đã DDL |
| 19 | `discovery_session` / `self_assessment_mismatch` | **Learner-owned** | Discovery | Dự kiến `learner_id = auth.uid()` (0 hop) / qua `discovery_session` (1 hop) |
| 20 | `recommendation_proposal` | **Learner-owned** | Recommendation | Dự kiến `learner_id = auth.uid()`, 0 hop |
| 21 | Decision Header (mechanism pending) | **Explainability-only** | Decision Persistence | Cùng pattern `trace_link` — không có `learner_id` đơn giản nếu thiết kế tối giản đúng nguyên tắc ([HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md)); **có thể có `learner_id`** nếu Header được thiết kế dạng forward-registry per-learner — chưa chốt, cần xác nhận khi mechanism được chọn |

### System-owned (ngoài Backend schema)

| # | Entity | Category | Lý do |
|---|---|---|---|
| 22 | `auth.users` | **System-owned** | Do Supabase Auth quản lý hoàn toàn — Backend không viết RLS cho bảng này, chỉ tham chiếu (`learner.id REFERENCES auth.users(id)`) |

---

## 2. Tổng hợp theo Category (trả lời Mandatory Question 5-7)

| Category | Số lượng | Danh sách |
|---|---|---|
| **Learner-owned** | 13 (+ 3 chưa DDL = 16 dự kiến) | `learner`, `goal`, `roadmap`, `roadmap_node`, `approval_record`, `learning_session`, `sub_session`, `learning_session_transition`*, `knowledge_node_mastery`, `evidence`, `evidence_link`, `assessment_result`, `roadmap_node_knowledge_node`; dự kiến: `mentor_session`, `discovery_session`/`self_assessment_mismatch`, `recommendation_proposal` |
| **Shared** | 3 | `knowledge_node`, `knowledge_edge`, `expansion_record` |
| **System-owned** | 1 | `auth.users` |
| **AI-owned** *(về nguồn gốc, không phải category RLS riêng — đã gộp vào Shared/Learner-owned theo visibility thật)* | 0 bảng riêng | Không có bảng nào *chỉ* AI ghi VÀ *không* Learner/Shared đọc được — `expansion_record`/`knowledge_node`/`knowledge_edge` (Shared) và mọi bảng Assessment/Recommendation (Learner-owned) đều có Learner là reader cuối — AI-owned ở đây là tính chất của **Writer**, không phải 1 Category Visibility riêng |
| **Audit-only** | 1 | `learning_session_transition` |
| **Explainability-only** | 1 (+ 1 chưa build) | `trace_link`; Decision Header (pending) |

\* `learning_session_transition` xuất hiện ở cả 2 hàng (Learner-owned về phạm vi sở hữu, Audit-only về cách dùng) — đây là 2 chiều phân loại không loại trừ nhau, đã ghi chú ở mục 1 dòng 8.

**Trả lời Mandatory Question 7 — Entities never được expose trực tiếp:** `trace_link`, Decision Header (pending), và `auth.users` (Backend không bao giờ tự ý ghi/đọc trực tiếp bảng này ngoài cách Supabase Auth quy định) — chi tiết đầy đủ ở [RLS_BOUNDARY_MATRIX.md](RLS_BOUNDARY_MATRIX.md) mục "Never Exposed".

---

## 3. Phát hiện quan trọng của Round này

1. **3 bảng Shared (`knowledge_node`/`knowledge_edge`/`expansion_record`) đã được DDL Round 2-3 tự nhận diện trước** — đây không phải phát hiện mới, Round này chỉ tổng hợp lại có hệ thống theo đúng 6 category được yêu cầu.
2. **`roadmap_node_knowledge_node` là bảng Learner-owned sâu nhất (3-hop)** — đã ghi nhận từ DDL_ROUND3_DESIGN, nay xác nhận lại đây là rủi ro hiệu năng/độ phức tạp Policy cao nhất trong nhóm Learner-owned.
3. **`trace_link` không fit gọn vào bất kỳ 5 category còn lại** — đây là lý do đề bài có category riêng "Explainability-only", và xác nhận khuyến nghị cũ (DDL_ROUND2_DESIGN mục 4 #7: "toàn bộ truy cập qua Backend") vẫn là hướng đúng duy nhất.
4. **Decision Header (chưa build) có 2 khả năng phân loại khác nhau** tuỳ cơ chế được chọn — đây là 1 điểm cần Founder/Lead Architect xác nhận **trước khi** viết Policy thật cho nó, không phải sau.

---

## Liên kết ngược

[RLS_ACTOR_MODEL.md](RLS_ACTOR_MODEL.md), [RLS_BOUNDARY_MATRIX.md](RLS_BOUNDARY_MATRIX.md), [SUPABASE_AUTH_ALIGNMENT.md](SUPABASE_AUTH_ALIGNMENT.md), [RLS_POLICY_STRATEGY.md](RLS_POLICY_STRATEGY.md), [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md), [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md), [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md), [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md).
