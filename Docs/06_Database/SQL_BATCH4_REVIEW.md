# SQL Batch 4 Review — Decision Persistence

> Review của [SQL_BATCH4_DECISION_PERSISTENCE.sql](SQL_BATCH4_DECISION_PERSISTENCE.sql). Đối chiếu [DDL_ROUND5_DESIGN.md](DDL_ROUND5_DESIGN.md), [DECISION-049](../11_Decisions/DECISION-049-Decision-Persistence-Mechanism.md), [DECISION-050](../11_Decisions/DECISION-050-SQL-PreGeneration-Finalization.md), [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md).

## 0. Bổ sung 1 ALTER ngoài danh sách "PATCH EXISTING TABLES" được giao tường minh

Task chỉ liệt kê 4 patch `decision_header_id` — không liệt kê `trace_link.source_type` enum extension. Tuy nhiên [DECISION-050](../11_Decisions/DECISION-050-SQL-PreGeneration-Finalization.md) mục 5 **khóa cứng tên giá trị cụ thể** (`teaching_decision_detail`, `local_expansion_decision_detail`, `stuck_detection_decision_detail`) chính xác cho mục đích "3 Detail mới Round 5 có thể trở thành điểm nối `trace_link` hợp lệ" — và [DECISION-049](../11_Decisions/DECISION-049-Decision-Persistence-Mechanism.md) mục 10 liệt kê tường minh "mở rộng enum `trace_link.source_type`" là 1 phần của "DDL nào trở nên khả thi sau DECISION-049". Bỏ qua ALTER này sẽ để 3 bảng Detail mới **không thể** trở thành `trace_link.source_type` hợp lệ dù 2 Decision Log đã khóa rõ chúng phải vậy — cùng bản chất quyết định như việc bổ sung `history.discovery_session`/`history.mentor_session` ở [SQL_BATCH3_REVIEW.md](SQL_BATCH3_REVIEW.md) mục 0. **Quyết định: thêm ALTER này**, ghi rõ lý do, không âm thầm.

**`target_type` KHÔNG được mở rộng ở batch này** — H-10 (`self_assessment_mismatch` thiếu trong `target_type`) là 1 gap khác, **chưa** được DECISION-050 giải quyết — không tự giải ở đây.

---

## 1. DECISION-049 Compliance

| Điều khoản DECISION-049 | Đối chiếu SQL |
|---|---|
| `decision_header` tồn tại | ✅ |
| Supporting Persistence Entity, không Domain Entity, không Aggregate Root | ✅ — comment SQL ghi rõ, không FK tới bất kỳ entity nghiệp vụ nào ngoài `learner_id` |
| Detail → Header (1 chiều) | ✅ — cả 5 bảng Detail có `decision_header_id` trỏ về `decision_header`; **không** cột nào trên `decision_header` trỏ tới Detail |
| Header/TraceLink tách biệt | ✅ — `decision_header` không có `source_*`/`target_*`; `trace_link` không có cột nào kiểu "decision đã xảy ra" |
| Toàn bộ 10/10 Decision Type cần Header | ✅ — `ck_decision_header_decision_type` đủ 10 giá trị `D1`-`D9b` |
| 9/10 cần Detail (trừ D8) | ✅ — đúng 5 Detail mới + 4 Detail cũ đã patch = 9; không bảng Detail nào cho D8 |
| D8 dùng Runtime Reconstruction | ✅ — không bảng Detail nào tên `mode_selection_*`/`d8_*` được tạo |

## 2. Header Remains Minimal

✅ `decision_header` chỉ có 9 cột: `decision_header_id`, `learner_id`, `decision_type`, `capability_or_domain`, `occurred_at`, `summary_reason`, `created_at`, `created_by_actor_type`, `created_by_actor_id` — **không** `detail_type`/`detail_id`, **không** `updated_at` (append-only), **không** `version_number`.

## 3. Header Owns No TraceLink Data

✅ Không cột `source_type`/`source_id`/`target_type`/`target_id` nào trên `decision_header` — verify trực tiếp trong `CREATE TABLE`, không có.

## 4. Header → Detail Direction Only

✅ Cả 5 `CREATE TABLE` Detail đều có `decision_header_id uuid NOT NULL` + `FOREIGN KEY ... REFERENCES decision_header`. `decision_header`'s `CREATE TABLE` không có cột nào tham chiếu ngược.

## 5. D8 Uses Header Only (No Detail Table)

✅ Xác nhận — 6 bảng mới được tạo đều map vào D1/D5/D6/D9a/D9b, **không có bảng nào** cho D8. Việc ghi nhận D8 đã xảy ra chỉ qua 1 row `decision_header` với `decision_type = 'D8'` — sẽ được Application Layer tạo, không cần bảng mới ở batch này.

## 6. GAP-01 Closure Path Exists

✅ `decision_header` (decision_type='D1') → `teaching_decision_detail` (1-1, `mentor_session_id`+`knowledge_node_id`+`selection_reasoning` đầy đủ) → (tùy chọn) `trace_link` (source_type='teaching_decision_detail', đã mở enum ở mục 0). Đường dữ liệu đầy đủ tồn tại — **đóng ở mức cấu trúc**, chưa đảm bảo Backend thực sự ghi vào đây (ngoài phạm vi SQL).

## 7. GAP-02 Closure Path Exists

✅ `decision_header` (D5) → `local_expansion_decision_detail` (`knowledge_node_id`+`expansion_reasoning` nội bộ). Đóng ở mức cấu trúc, đúng cách GAP-01.

## 8. GAP-05 Closure Path Exists

✅ `decision_header` (D6) → `roadmap_mapping_decision_detail` (`roadmap_node_knowledge_node_id`+`mapping_reasoning`) — **không sửa** `roadmap_node_knowledge_node` (đã verify: không `ALTER TABLE roadmap_node_knowledge_node` nào trong file SQL).

## 9. D9a Persistence Path Exists

✅ `decision_header` (D9a) → `stuck_detection_decision_detail` (`sub_session_id`+`signal_payload` jsonb+`detection_reasoning`). **Persistence path tồn tại** — thuật toán Stuck Detection (Open Q#6/#11) **vẫn chưa giải**, đúng comment SQL đã ghi rõ, không tự quyết định ở đây.

## 10. D9b Persistence Path Exists

✅ `decision_header` (D9b) → `intervention_decision_detail` (`stuck_detection_decision_detail_id`+`intervention_tier`+`intervention_reasoning`). `intervention_tier` đúng 2 giá trị đã khóa ở [DECISION-050](../11_Decisions/DECISION-050-SQL-PreGeneration-Finalization.md) mục 2 (`hint`, `guided_walkthrough`) — đã verify **không có `direct_fix`** trong CHECK constraint.

## 11. Existing Round 1-4 Tables Remain Compatible

| Bảng bị `ALTER` | Cột/Constraint cũ có bị đổi không? |
|---|---|
| `assessment_result` | ❌ Không — chỉ `ADD COLUMN decision_header_id` (nullable) + FK + partial unique index mới. 13 cột/constraint gốc (Round 2) giữ nguyên 100% |
| `recommendation_proposal` | ❌ Không — cùng pattern |
| `expansion_record` | ❌ Không — cùng pattern |
| `self_assessment_mismatch` | ❌ Không — cùng pattern |
| `trace_link` | 🟡 `DROP CONSTRAINT` + `ADD CONSTRAINT` lại **cùng tên** `ck_trace_link_source_type`, chỉ **mở rộng danh sách giá trị** (giữ nguyên 3 giá trị cũ, thêm 3 giá trị mới) — không đổi cột, không đổi `target_type`, không ảnh hưởng dữ liệu hiện có (mọi `source_type` cũ vẫn hợp lệ) |
| `roadmap_node_knowledge_node` | ❌ Không chạm — đúng yêu cầu "Do not redesign existing aggregates" |

**Không có Aggregate nào bị redesign** — mọi thay đổi là thêm cột/constraint mới hoặc mở rộng 1 CHECK list, không sửa ý nghĩa cột đã khóa nào.

## 12. Supabase Compatibility

| Điểm | Đánh giá |
|---|---|
| `ALTER TABLE ... ADD COLUMN ... NULL` | An toàn, không cần `DEFAULT`/rewrite toàn bảng (PostgreSQL 11+ tối ưu `ADD COLUMN` với giá trị NULL cố định, không lock-scan bảng) |
| `ALTER TABLE ... DROP CONSTRAINT` + `ADD CONSTRAINT` cùng tên | Hợp lệ — PostgreSQL cho phép tái dùng tên constraint sau khi đã `DROP` trong cùng transaction |
| `CREATE UNIQUE INDEX ... WHERE decision_header_id IS NOT NULL` (×4) | Lần dùng thứ 4-5 trong toàn schema (sau `roadmap_node_knowledge_node`, `discovery_session`) — không phát hiện vấn đề mới |
| `jsonb` cho `signal_payload` | Native, không vấn đề |

**Không phát hiện vấn đề tương thích Supabase nào.**

---

## 13. Open Items kế thừa — chưa được Decision Log khóa cứng

| Item | Trạng thái |
|---|---|
| `trace_link.target_type` thiếu `self_assessment_mismatch` (H-10) | **Vẫn mở** — không giải ở batch này, ngoài phạm vi DECISION-050 |
| `evidence.mentor_session_id` thiếu CHECK ràng buộc với `source_type` (H-11) | Vẫn mở — không thuộc phạm vi Batch 4 |
| `recommendation_proposal.traced_to[]` "no exception" không DB-enforced (C-05) | Vẫn mở — Batch 4 không thêm trigger/Service layer nào để giải, đúng "Architecture only" đã chốt trước đó |
| Cơ chế ép buộc 4 Detail cũ phải có `decision_header_id` cho hàng mới (R5-03) | Vẫn mở — `decision_header_id` vẫn nullable vĩnh viễn theo thiết kế, không trigger nào ép buộc |

**Không open item nào trong số này chặn việc sinh SQL ở Batch 4** — đều là rủi ro vận hành/Application Layer đã biết từ trước, không phải lỗi mới phát sinh.

## Liên kết ngược

[SQL_BATCH4_DECISION_PERSISTENCE.sql](SQL_BATCH4_DECISION_PERSISTENCE.sql), [SQL_BATCH3_REVIEW.md](SQL_BATCH3_REVIEW.md), [DDL_ROUND5_DESIGN.md](DDL_ROUND5_DESIGN.md), [DDL_ROUND5_GAP_ANALYSIS.md](DDL_ROUND5_GAP_ANALYSIS.md), [DECISION-049](../11_Decisions/DECISION-049-Decision-Persistence-Mechanism.md), [DECISION-050](../11_Decisions/DECISION-050-SQL-PreGeneration-Finalization.md).

**Next:** Batch 5 — RLS (`ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` cho toàn bộ 32 bảng, theo 5 nhóm RLS đã hoạch định ở [POSTGRESQL_FEATURE_MATRIX.md](POSTGRESQL_FEATURE_MATRIX.md) mục 6). Sau Batch 5: toàn bộ schema vật lý hoàn tất, không còn bảng/cột/FK nào treo.
