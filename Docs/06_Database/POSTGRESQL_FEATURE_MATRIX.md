# PostgreSQL Feature Matrix — AI Mentor OS

> Phụ lục chi tiết cho [SQL_GENERATION_MASTER_PLAN.md](SQL_GENERATION_MASTER_PLAN.md). Liệt kê đầy đủ mọi tính năng PostgreSQL-specific cần dùng khi sinh SQL thật: CHECK/ENUM, Unique (kể cả partial), Index, RLS Policy Group. Không SQL — chỉ liệt kê đặc tả.

## 1. CHECK Constraints — danh sách đầy đủ (thay native ENUM, xem [SQL_GENERATION_MASTER_PLAN.md](SQL_GENERATION_MASTER_PLAN.md) mục 4)

### 1.1 Nhóm `actor_type` (lặp lại mọi bảng có audit — danh sách giá trị giống nhau 100%)

`IN ('learner','backend_core','ai_service')` — áp dụng cho `created_by_actor_type` (28/28 bảng) và `updated_by_actor_type` (9 bảng Snapshot). **56 CHECK constraint cùng 1 danh sách giá trị** — đây chính là ứng viên rõ nhất cho native `ENUM` nếu Founder muốn tối ưu, nhưng Master Plan giữ CHECK theo quyết định đã chốt (mục 4, SQL_GENERATION_MASTER_PLAN).

### 1.2 Nhóm `state`/`status` (riêng theo từng bảng, không dùng chung)

| Bảng | Cột | Giá trị |
|---|---|---|
| `learning_session` | `state` | `active`/`paused`/`completed`/`archived` |
| `sub_session` | `state` | `active`/`ended` |
| `discovery_session` | `state` | `active`/`ended` |
| `mentor_session` | `state` | `active`/`ended` |
| `roadmap_node` | `node_status` | `collapsed`/`expanded`/`completed` |
| `learning_session_transition` | `from_state`/`to_state` | `active`/`paused`/`completed`/`archived` |

### 1.3 Nhóm discriminator đa hình/đặc thù

| Bảng | Cột | Giá trị |
|---|---|---|
| `evidence` | `source_type` | `mentor_session`/`submission`/`discovery_session` |
| `evidence_link` | `stance` | `support`/`refute` |
| `evidence_link` | `target_mastery_dimension` | `remember`/`explain_level`/`apply`/`teach_explain`/`teach_simplify`/`teach_guide`/`teach_review`/`teach_transfer_knowledge` |
| `trace_link` | `source_type` | `assessment_result`/`recommendation_proposal`/`local_expansion` + **3 giá trị mới Round 5**: `teaching_content_selection`/`local_expansion`/`stuck_detection_signal` *(lưu ý: `local_expansion` đã trùng tên — xem Risk mục 5)* |
| `trace_link` | `target_type` | `evidence`/`assessment_result`/`discovery_session` |
| `knowledge_edge` | `relation_type` | `expands_to`/`prerequisite_of`/`related_to` *(danh sách mở, đề xuất)* |
| `knowledge_node` | `domain_category` | `programming`/`ai`/`design`/`language`/`marketing`/`business`/`career_skill`/... *(danh sách mở, đề xuất — có thể bỏ CHECK hoàn toàn nếu Founder muốn giữ mở tuyệt đối)* |
| `expansion_record` | `expansion_class` | `deep`/`structural` *(đề xuất)* |
| `recommendation_proposal` | `action_type` | `pause_learning_session`/`review_knowledge_node`/`roadmap_adjustment_suggestion` *(suy luận, chưa khóa Decision Log)* |
| `recommendation_proposal_response` | `response` | `confirmed`/`ignored` |
| `mentor_session` | `learning_mode` | `A`/`B`/`C`/`D` |
| `decision_header` | `decision_type` | `D1`/`D2`/`D3`/`D4`/`D5`/`D6`/`D7`/`D8`/`D9a`/`D9b` |
| `decision_header` | `capability_or_domain` | `teaching_capability`/`assessment_domain`/`recommendation_domain`/`knowledge_graph_domain`/`goal_roadmap_domain`/`discovery_domain`/`mentor_interaction_domain` |
| `intervention_decision_detail` | `intervention_tier` | `hint`/`guided_walkthrough`/`direct_fix` *(suy luận, chưa khóa Decision Log)* |
| `self_assessment_mismatch` | `self_reported_level` | `remember`/`explain`/`apply`/`teach` *(suy luận, chưa khóa Decision Log)* |

### 1.4 Nhóm "not empty" (Explainability artifact)

`length(trim(<col>)) > 0` áp dụng cho: `assessment_result.reasoning`, `expansion_record.expansion_reason`, `self_assessment_mismatch.mismatch_reasoning`, `decision_header.summary_reason`, `teaching_decision_detail.selection_reasoning`, `local_expansion_decision_detail.expansion_reasoning`, `roadmap_mapping_decision_detail.mapping_reasoning`, `stuck_detection_decision_detail.detection_reasoning`, `intervention_decision_detail.intervention_reasoning` — **9 cột reasoning, 9 CHECK**.

### 1.5 Nhóm range numeric

| Bảng | Cột | Range |
|---|---|---|
| `knowledge_node_mastery` | `teach_score` | `[0,1]` |
| `knowledge_node_mastery` | `confidence` | `[0,1]` hoặc `NULL` |
| `assessment_result` | `teach_score` | `[0,1]` |
| `assessment_result` | `confidence` | `[0,1]` |
| `evidence_link` | `evidence_weight` | `>= 0` (chưa có giới hạn trên, công thức chưa chốt) |
| `roadmap_node` | `sort_order` | `>= 0` |

### 1.6 Nhóm structural/consistency

| Bảng | CHECK | Ý nghĩa |
|---|---|---|
| `goal` | `ck_goal_no_self_supersede` | `supersedes_goal_id <> goal_id` |
| `roadmap_node` | `ck_roadmap_node_no_self_parent` | `parent_roadmap_node_id <> roadmap_node_id` |
| `knowledge_edge` | `ck_knowledge_edge_no_self_loop` | `from_knowledge_node_id <> to_knowledge_node_id` |
| `sub_session` | `ck_sub_session_scope_exactly_one` | đúng 1 trong `roadmap_node_id`/`knowledge_node_id` |
| `learning_session` | `ck_learning_session_ended_at_consistency` | `ended_at` khớp `state` |
| `sub_session`/`discovery_session`/`mentor_session` | `ck_*_ended_at_consistency` | `ended_at` khớp `state` (3 bảng, cùng pattern) |

---

## 2. Unique Constraints — danh sách đầy đủ

| Bảng | Unique Constraint | Loại |
|---|---|---|
| `roadmap` | `uq_roadmap_goal_id` | Đầy đủ |
| `learning_session` | `uq_learning_session_goal_id` | Đầy đủ |
| `roadmap_node` | `uq_roadmap_node_roadmap_id_parent_roadmap_node_id_sort_order` | Đề xuất |
| `knowledge_node_mastery` | `uq_knowledge_node_mastery_learner_id_knowledge_node_id` | Đầy đủ |
| `knowledge_edge` | `uq_knowledge_edge_from_to_relation_type` | Đề xuất |
| `evidence_link` | `uq_evidence_link_evidence_id_knowledge_node_id_stance` | Đề xuất |
| `trace_link` | `uq_trace_link_source_target` (4 cột) | Đề xuất |
| `recommendation_proposal_response` | `uq_recommendation_proposal_response_recommendation_proposal_id` | Đầy đủ |
| `teaching_decision_detail` | `uq_teaching_decision_detail_decision_header_id` | Đầy đủ |
| `local_expansion_decision_detail` | `uq_local_expansion_decision_detail_decision_header_id` | Đầy đủ |
| `roadmap_mapping_decision_detail` | `uq_roadmap_mapping_decision_detail_decision_header_id` | Đầy đủ |
| `stuck_detection_decision_detail` | `uq_stuck_detection_decision_detail_decision_header_id` | Đầy đủ |
| `intervention_decision_detail` | `uq_intervention_decision_detail_decision_header_id` | Đầy đủ |

**13 Unique Constraint đầy đủ** (5 "Đầy đủ" 1-cột + 5 Detail Round 5 + 1 `roadmap`/`learning_session`/`knowledge_node_mastery`) **+ 4 Partial Unique** (mục 3 dưới) — tổng 17 ràng buộc Unique xuyên 28 bảng. 4 trong số trên ("Đề xuất") cần Founder xác nhận trước khi khóa cứng (xem từng `DDL_ROUNDx_GAP_ANALYSIS.md`).

---

## 3. Partial Indexes (Unique và non-Unique)

### 3.1 Partial Unique (toàn vẹn dữ liệu)

| Bảng | Index | `WHERE` | Mục đích |
|---|---|---|---|
| `roadmap_node_knowledge_node` | `uq_roadmap_node_knowledge_node_active` | `removed_at IS NULL` | Không trùng dependency "đang hiệu lực" |
| `discovery_session` | `uq_discovery_session_learner_id_active` | `state = 'active'` | 1 Discovery Session active/Learner *(đề xuất, chưa khóa)* |
| `assessment_result` | `uq_assessment_result_decision_header_id` | `decision_header_id IS NOT NULL` | 1 Detail/Header (chỉ áp dụng hàng có Header) |
| `recommendation_proposal` | `uq_recommendation_proposal_decision_header_id` | `decision_header_id IS NOT NULL` | Cùng lý do |
| `expansion_record` | `uq_expansion_record_decision_header_id` | `decision_header_id IS NOT NULL` | Cùng lý do |
| `self_assessment_mismatch` | `uq_self_assessment_mismatch_decision_header_id` | `decision_header_id IS NOT NULL` | Cùng lý do |

### 3.2 Partial Index (hiệu năng, không phải toàn vẹn) — đề xuất mới ở Round Planning này, không có trong DDL Round 1-5

| Bảng | Index đề xuất | `WHERE` | Lý do |
|---|---|---|---|
| `learning_session` | `ix_learning_session_learner_id_active` | `state = 'active'` | Hot Path #7 (DatabaseBlueprint mục 4) — "LearningSession đang active của 1 Learner", đa số truy vấn chỉ quan tâm hàng active, index toàn bảng phí không gian |
| `sub_session` | `ix_sub_session_learning_session_id_active` | `state = 'active'` | Cùng Hot Path #7 |
| `mentor_session` | `ix_mentor_session_learner_id_active` | `state = 'active'` | Tương tự, phục vụ "đang trong lượt tương tác nào" |
| `discovery_session` | `ix_discovery_session_learner_id_active` | `state = 'active'` | Trùng mục đích với Unique 3.1 — có thể dùng chính Unique Index đó làm Partial Index luôn, không cần tạo thêm |
| `recommendation_proposal` | `ix_recommendation_proposal_learner_id_no_response` | *(cần JOIN `recommendation_proposal_response`, không thể partial index đơn giản trên 1 bảng — đề xuất dùng index thường + JOIN, không partial)* | Hot Path #6 ("đề xuất đang chờ xử lý") |

**🔶 Mục 3.2 là đề xuất mới phát sinh ở Round Planning, không phải nội dung đã khóa ở DDL Round 1-5** — cần xác nhận trước khi sinh SQL thật (không ảnh hưởng cấu trúc cột/bảng, chỉ là tối ưu đọc).

---

## 4. Index Strategy (Non-Partial) — bám theo 9 Hot Path đã khóa ở [DatabaseBlueprint.md](DatabaseBlueprint.md) mục 4

| # Hot Path | Entity | Index đề xuất |
|---|---|---|
| 1 — Mastery point lookup | `knowledge_node_mastery` | (đã có Unique `uq_knowledge_node_mastery_learner_id_knowledge_node_id` — tự động có B-Tree index, không cần thêm) |
| 2 — AssessmentResult theo Learner×KnowledgeNode, time-ordered | `assessment_result` | `ix_assessment_result_learner_id_knowledge_node_id` (+ ULID PK tự nhiên sortable theo thời gian, không cần cột `created_at` riêng trong index) |
| 3 — Cây RoadmapNode theo `roadmap_id` | `roadmap_node` | `ix_roadmap_node_roadmap_id`, `ix_roadmap_node_parent_roadmap_node_id` (phục vụ Recursive CTE 2 chiều: theo `roadmap_id` gốc, và theo cha khi đệ quy xuống) |
| 4 — Traversal KnowledgeGraph 2 chiều | `knowledge_edge` | `ix_knowledge_edge_from_knowledge_node_id`, `ix_knowledge_edge_to_knowledge_node_id` |
| 5 — Drill-down TraceLink 2 chiều | `trace_link` | `ix_trace_link_source_type_source_id`, `ix_trace_link_target_type_target_id` |
| 6 — RecommendationProposal đang chờ xử lý | `recommendation_proposal` | `ix_recommendation_proposal_learner_id` (kết hợp `LEFT JOIN recommendation_proposal_response IS NULL` ở Application Layer/View, không phải index riêng) |
| 7 — LearningSession/SubSession active | `learning_session`, `sub_session` | `ix_learning_session_learner_id` (+ Partial Index mục 3.2), `ix_sub_session_learning_session_id` |
| 8 — Lịch sử ApprovalRecord theo `roadmap_id` | `approval_record` | `ix_approval_record_roadmap_id` |
| 9 — Memory/Learning Profile tổng hợp theo `learner_id` | `goal`, `assessment_result`, `discovery_session` | `ix_goal_learner_id`, `ix_assessment_result_learner_id` (đã có ở #2, cột đầu trùng), `ix_discovery_session_learner_id` |

**Nguyên tắc bổ sung — mọi FK nên có index riêng nếu chưa nằm trong index Hot Path nào ở trên** (phục vụ JOIN + `ON DELETE` check hiệu quả): áp dụng cho toàn bộ FK còn lại chưa liệt kê (`evidence.learner_id`, `evidence_link.evidence_id`, `mentor_session.sub_session_id`, mọi `decision_header_id` trên 9 Detail, v.v.) — PostgreSQL **không tự tạo index cho FK** (khác 1 số RDBMS khác), đây là điểm cần lưu ý khi sinh SQL thật.

---

## 5. Risks phát hiện ở Feature Matrix (mới, ngoài phạm vi DDL Round 1-5)

| # | Rủi ro | Mức độ |
|---|---|---|
| 1 | **Giá trị `'local_expansion'` trùng tên giữa `expansion_record`-era (D4 cũ dùng tên này cho 1 khái niệm) và `trace_link.source_type` giá trị mới Round 5** — cần xác nhận không gây nhầm lẫn ngữ nghĩa khi đọc dữ liệu thô (`source_type = 'local_expansion'` trỏ tới `local_expansion_decision_detail`, không phải `expansion_record`) | Medium |
| 2 | **PostgreSQL không tự tạo index cho FK** — nếu Backend quên thêm `ix_*` cho 1 FK ít dùng, performance JOIN/DELETE-check sẽ kém mà không có lỗi nào báo trước — cần checklist đối chiếu đầy đủ trước khi đóng Round SQL Generation | Medium |
| 3 | **56 CHECK constraint cùng giá trị `actor_type`** — nếu Founder quyết định đổi danh sách (vd thêm `'admin'`), cần `ALTER` 56 constraint riêng lẻ (không có 1 ENUM type trung tâm để sửa 1 lần) — đánh đổi đã biết, chấp nhận theo quyết định mục 4 ([SQL_GENERATION_MASTER_PLAN.md](SQL_GENERATION_MASTER_PLAN.md)) | Low (đã biết, đánh đổi cố ý) |

## 6. RLS Policy Groups — chi tiết đầy đủ 28 bảng

| Nhóm | Pattern Policy | Bảng |
|---|---|---|
| **1 — Learner-owned, 0-hop** (10) | `learner_id = auth.uid()` (hoặc `id = auth.uid()` riêng `learner`) | `learner`, `goal`, `learning_session`, `evidence`, `assessment_result`, `knowledge_node_mastery`, `discovery_session`, `mentor_session`, `recommendation_proposal`, `decision_header` |
| **2 — Learner-owned, 1-hop** (11) | `EXISTS (SELECT 1 FROM <cha> WHERE <cha>.pk = <bảng>.fk AND <cha>.learner_id = auth.uid())` | `roadmap` (qua `goal`), `sub_session` (qua `learning_session`), `learning_session_transition` (qua `learning_session`), `evidence_link` (qua `evidence`), `self_assessment_mismatch` (qua `discovery_session`), `recommendation_proposal_response` (qua `recommendation_proposal`), `teaching_decision_detail`/`local_expansion_decision_detail`/`roadmap_mapping_decision_detail`/`stuck_detection_decision_detail`/`intervention_decision_detail` (qua `decision_header`) |
| **3 — Learner-owned, 2-hop** (2) | 2 lớp `EXISTS` lồng | `roadmap_node` (qua `roadmap`→`goal`); `approval_record` (qua `roadmap`→`goal`, **hoặc** trực tiếp `approved_by_learner_id = auth.uid()` — 2 đường, policy cần `OR`) |
| **4 — Learner-owned, 3-hop** (1) | 3 lớp `EXISTS` lồng | `roadmap_node_knowledge_node` (qua `roadmap_node`→`roadmap`→`goal`) |
| **5 — Shared/Global** (4) | Đọc: `TO authenticated USING (true)`; Ghi: chỉ `service_role` (bypass RLS, không cần Policy ghi riêng cho `authenticated`) | `knowledge_node`, `knowledge_edge`, `expansion_record`, `trace_link` |

**Tổng: 10 + 11 + 2 + 1 + 4 = 28** — khớp đúng tổng số bảng, khớp [SQL_GENERATION_MASTER_PLAN.md](SQL_GENERATION_MASTER_PLAN.md) mục 10 (`roadmap` thuộc Nhóm 2/1-hop qua `goal`, không phải Nhóm 1).

## Liên kết ngược

[SQL_GENERATION_MASTER_PLAN.md](SQL_GENERATION_MASTER_PLAN.md), [MIGRATION_DEPENDENCY_GRAPH.md](MIGRATION_DEPENDENCY_GRAPH.md), [DatabaseBlueprint.md](DatabaseBlueprint.md) mục 4, [DatabaseNamingConvention.md](DatabaseNamingConvention.md), [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md).

**Chưa có SQL/`CREATE INDEX`/`CREATE POLICY` nào được tạo — đây là đặc tả tính năng PostgreSQL cần dùng, phục vụ lập kế hoạch.**
