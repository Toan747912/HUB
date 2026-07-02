# SQL Batch 2 Review — Knowledge + Evidence + Assessment

> Review của [SQL_BATCH2_KNOWLEDGE_EVIDENCE_ASSESSMENT.sql](SQL_BATCH2_KNOWLEDGE_EVIDENCE_ASSESSMENT.sql). Đối chiếu [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md), [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md) mục 1.1-1.2, [SQL_GENERATION_MASTER_PLAN.md](SQL_GENERATION_MASTER_PLAN.md), [MIGRATION_DEPENDENCY_GRAPH.md](MIGRATION_DEPENDENCY_GRAPH.md), [DECISION-015](../11_Decisions/DECISION-015-Knowledge-Engine.md), [DECISION-022](../11_Decisions/DECISION-022-Evidence-KnowledgeNode-M2M.md), [DECISION-025](../11_Decisions/DECISION-025-Knowledge-Graph-DAG.md), [DECISION-026](../11_Decisions/DECISION-026-Assessment-Core-Domain.md), [DECISION-029-Cycle-Detection-Strategy](../11_Decisions/DECISION-029-Cycle-Detection-Strategy.md), [DECISION-030](../11_Decisions/DECISION-030-Assessment-Result-Granularity.md), [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md).

## 0. Phạm vi — gộp Round 2 + Round 3 vào 1 batch

Batch này gộp 7 bảng Round 2 (`knowledge_node`, `knowledge_edge`, `evidence`, `evidence_link`, `assessment_result`, `knowledge_node_mastery`, `trace_link`) với 2 bảng Round 3 (`roadmap_node_knowledge_node`, `expansion_record`) + `history.knowledge_node` — đúng 10 bảng được giao tường minh trong task này, khác với cách chia Batch 2/Batch 3 riêng ở [SQL_GENERATION_MASTER_PLAN.md](SQL_GENERATION_MASTER_PLAN.md) mục 2. Không có cycle/dependency nào bị phá vỡ bởi việc gộp (đã xác nhận ở [MIGRATION_DEPENDENCY_GRAPH.md](MIGRATION_DEPENDENCY_GRAPH.md) mục 2 — 0 cycle thật trong toàn schema).

**2 closure ALTER đã hoạch định ở Master Plan KHÔNG được sinh ở batch này** (đúng, không phải thiếu sót):
- `sub_session.knowledge_node_id` FK → `knowledge_node` — `sub_session` **chưa tồn tại** (Learning Session Module chưa được giao ở batch nào tới giờ).
- `evidence.mentor_session_id` FK → `mentor_session` — `mentor_session` **chưa tồn tại** (Round 4 batch).

Cả 2 closure này phải đợi đúng batch tạo ra bảng đích, không thể làm sớm hơn — nguyên tắc này được giữ nhất quán, không tự ý đẩy lên sớm.

---

## 1. Knowledge Graph Integrity

✅ `knowledge_node` không FK nào (gốc graph) — đúng thiết kế. `knowledge_edge` có 2 FK `RESTRICT` tới `knowledge_node`, append-only (không `updated_at`). **Không có cột `parent_id`/`depth`/closure-table nào** — đúng xác nhận quan trọng từ [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md) mục 1.2 ("Xác nhận quan trọng"): DECISION-029 chọn Runtime Reachability Check, DECISION-039 chọn bảng quan hệ + Recursive CTE, không Graph Extension nào của PostgreSQL (không `ltree`, không cấu trúc cây native) được dùng.

## 2. Multi-Parent Support

✅ Hỗ trợ tự nhiên — không có `UNIQUE` nào trên riêng `to_knowledge_node_id`, nghĩa là N row `knowledge_edge` khác nhau (khác `from_knowledge_node_id`) đều có thể cùng trỏ tới 1 `to_knowledge_node_id`. `uq_knowledge_edge_from_to_relation_type` chỉ chặn **trùng lặp hoàn toàn** (cùng cặp + cùng loại quan hệ), không chặn multi-parent.

## 3. Cycle-Prevention Assumptions

⚠️ **Xác nhận rõ — DB chỉ chặn được self-loop 1-hop** (`ck_knowledge_edge_no_self_loop`). **Không có CHECK/trigger nào ngăn cycle nhiều hop** (vd A→B→C→A) — đây là **giả định đã biết và được chấp nhận** từ DECISION-029 ("Runtime Reachability Check" — Application Layer phải tự kiểm tra trước khi `INSERT` 1 `knowledge_edge` mới, bằng Recursive CTE kiểm tra `to_knowledge_node_id` có thể truy ngược tới `from_knowledge_node_id` hay không). **Không phải thiếu sót của Batch 2** — đúng theo Decision Log, ghi nhận lại để Backend không hiểu nhầm DB tự bảo vệ khỏi cycle.

## 4. Evidence Stance Model

✅ Đúng DECISION-022 — không có bảng `positive_evidence`/`negative_evidence` nào được tạo. `evidence_link.stance IN ('support','refute')` là cơ chế duy nhất biểu diễn Positive/Negative, đúng 1 `evidence` có thể đồng thời `support` 1 `knowledge_node` và `refute` 1 `knowledge_node` khác (không có ràng buộc nào ngăn điều này — 2 row `evidence_link` khác `knowledge_node_id`/`stance` cho cùng 1 `evidence_id` là hợp lệ).

## 5. Assessment Ownership

✅ `assessment_result` và `knowledge_node_mastery` **cùng write-owner Assessment Domain** (DECISION-026) — dù được nhóm trong 1 file SQL theo "Knowledge/Evidence/Assessment Module" (cách gọi tên batch), comment SQL trên cả 2 bảng đã ghi rõ ownership thật, tránh hiểu nhầm "Knowledge Graph Domain sở hữu `knowledge_node_mastery`" chỉ vì tên cột đứng gần `knowledge_node`. Không Ownership Conflict.

## 6. TraceLink Architecture

✅ Đúng DECISION-038 — `source_id`/`target_id` **không có FK vật lý**, `source_type`/`target_type` dùng CHECK với danh sách **đúng baseline Round 1-2 gốc** (`assessment_result`/`recommendation_proposal`/`local_expansion` cho source; `evidence`/`assessment_result`/`discovery_session` cho target) — **không** tự thêm giá trị nào của Round 4/5 ở batch này (đúng nguyên tắc "mở rộng enum đúng tại batch giới thiệu entity tương ứng", tránh tạo CHECK value không có bảng nào đứng sau nó để kiểm chứng ý nghĩa). `uq_trace_link_source_target` sinh đúng như đề xuất Round 2, chưa phải Decision Log khóa cứng (ghi nhận open item mục 9).

## 7. ExpansionRecord Compliance

✅ Đúng DECISION-023 — `expansion_reason NOT NULL` + `ck_expansion_record_reason_not_empty` (bắt buộc hiển thị Learner, không cho phép rỗng dù `NOT NULL`). Phân biệt rõ với D5 Local Expansion (`local_expansion_decision_detail`, Round 5 — không tạo ở đây, không nhầm lẫn 2 cơ chế). Không FK tới `knowledge_edge` cụ thể — đúng giới hạn đã biết (cardinality chưa khóa ở Domain Architecture), không tự thêm.

## 8. History Strategy

✅ `history.knowledge_node` tạo ngay sau `knowledge_node`, đúng Hard Contract đã xác nhận ở [SQL_BATCH0_REVIEW.md](SQL_BATCH0_REVIEW.md)/[SQL_BATCH1_REVIEW.md](SQL_BATCH1_REVIEW.md) mục 4: 10 cột mirror đúng thứ tự `CREATE TABLE public.knowledge_node` + `valid_from`. **Không có PRIMARY KEY** trên `history.knowledge_node` — cùng lý do đã ghi nhận ở `history.learner` (`now()` đóng băng trong 1 transaction, Risk đã mở từ Batch 1, không lặp lại phân tích đầy đủ ở đây). 7 bảng append-only trong batch này (`knowledge_edge`, `evidence`, `evidence_link`, `assessment_result`, `trace_link`, `expansion_record`, `roadmap_node_knowledge_node`) **đúng không có History Table** — tự thân đã là lịch sử đầy đủ. `knowledge_node_mastery` **đúng không có History Table** — bảo vệ qua companion log `assessment_result`.

## 9. Versioning Strategy

✅ `knowledge_node_mastery.version_number` + `trg_knowledge_node_mastery_increment_version_number` — đúng **bắt buộc** theo DECISION-044 (rủi ro ghi đồng thời cao nhất đã xác định). Không bảng nào khác trong Batch 2 có `version_number` — đúng, mọi bảng còn lại append-only (không rủi ro ghi đồng thời) hoặc `knowledge_node` (Snapshot nhưng không có rủi ro ghi đồng thời cao được xác định, bảo vệ qua History Table thay versioning).

## 10. Supabase Compatibility

| Điểm | Đánh giá |
|---|---|
| `numeric(4,3)`/`numeric(3,2)` | Kiểu chuẩn PostgreSQL, không vấn đề Supabase |
| `jsonb NOT NULL DEFAULT '{}'` | Native, index được qua GIN nếu cần sau (chưa cần ở batch này) |
| `CREATE UNIQUE INDEX ... WHERE removed_at IS NULL` (partial unique) | Đã xác nhận tương thích Supabase managed Postgres từ Design Round — lần dùng thật đầu tiên trong SQL, không phát hiện vấn đề |
| FK tới `knowledge_node`/`learner`/`roadmap_node` (Batch 1) | Đều đã tồn tại trước khi Batch 2 chạy — không lỗi "relation does not exist" |
| Index trên mọi FK | Đã thêm đầy đủ — `ix_knowledge_edge_from/to_knowledge_node_id`, `ix_evidence_learner_id`, `ix_evidence_mentor_session_id` (dù chưa có FK), `ix_evidence_link_evidence_id/knowledge_node_id`, `ix_expansion_record_knowledge_node_id`, `ix_roadmap_node_knowledge_node_roadmap_node_id/knowledge_node_id`, `ix_trace_link_source/target` |

**Không phát hiện vấn đề tương thích Supabase nào.**

---

## 11. Open Items kế thừa từ Design — chưa được Decision Log khóa cứng (sinh đúng theo Design, không tự khóa thêm)

| Constraint | Bảng | Trạng thái |
|---|---|---|
| `ck_knowledge_node_domain_category` (7 giá trị) | `knowledge_node` | Danh sách mở — PRD OpenQuestions #3 (phạm vi MVP domain) chưa trả lời |
| `uq_knowledge_edge_from_to_relation_type` | `knowledge_edge` | Đề xuất, chưa khóa |
| `ck_knowledge_edge_relation_type` (3 giá trị) | `knowledge_edge` | Danh sách mở, Open Question #18 |
| `uq_evidence_link_evidence_id_knowledge_node_id_stance` | `evidence_link` | Đề xuất, chưa khóa |
| `uq_trace_link_source_target` | `trace_link` | Đề xuất, chưa khóa |
| `ck_expansion_record_expansion_class` (`deep`/`structural`) | `expansion_record` | Suy luận của Claude, có thể gộp 1 giá trị nếu Founder xác nhận |

**Không có open item nào trong số này chặn việc sinh SQL** — tất cả được sinh đúng theo Design đã có (không bỏ, không tự thêm gì ngoài Design), chỉ cần Founder/ChatGPT xác nhận trước khi coi là cuối cùng — sửa sau (nếu cần) chỉ là `ALTER TABLE ... DROP/ADD CONSTRAINT`, không phải đổi cấu trúc bảng.

## Liên kết ngược

[SQL_BATCH2_KNOWLEDGE_EVIDENCE_ASSESSMENT.sql](SQL_BATCH2_KNOWLEDGE_EVIDENCE_ASSESSMENT.sql), [SQL_BATCH1_IDENTITY_GOAL_ROADMAP.sql](SQL_BATCH1_IDENTITY_GOAL_ROADMAP.sql), [SQL_BATCH1_REVIEW.md](SQL_BATCH1_REVIEW.md), [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md), [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md), [MIGRATION_DEPENDENCY_GRAPH.md](MIGRATION_DEPENDENCY_GRAPH.md), [POSTGRESQL_FEATURE_MATRIX.md](POSTGRESQL_FEATURE_MATRIX.md).

**Next:** Learning Session Module batch (nếu chưa chạy) để đóng `sub_session.knowledge_node_id`, sau đó Round 4 batch (Discovery/Mentor Interaction/Recommendation) để đóng `evidence.mentor_session_id` và mở rộng `trace_link` enum.
