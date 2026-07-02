# SQL Batch 5 Review — Full Schema Completion & Consistency

> Audit của [SQL_BATCH0_INFRASTRUCTURE.sql](SQL_BATCH0_INFRASTRUCTURE.sql) → [SQL_BATCH4_DECISION_PERSISTENCE.sql](SQL_BATCH4_DECISION_PERSISTENCE.sql) (toàn bộ 32 bảng đã sinh), đối chiếu [SQL_BATCH5_COMPLETION.sql](SQL_BATCH5_COMPLETION.sql). Phương pháp: đọc lại **verbatim** từng file SQL gốc (không dựa vào trí nhớ), build 1 bảng coverage cho mỗi VERIFY point dưới đây trước khi kết luận.

## 0. Phạm vi

Đây **không** phải vòng thiết kế mới. Không bảng mới, không cột mới (ngoài 0 — không có), không Domain mới, không Decision mới. Chỉ 3 `CREATE INDEX` được sinh (mục 12), đóng đúng 3 gap đã verify, không suy đoán thêm.

---

## 1. FK Integrity — mọi FK trỏ tới bảng đã tồn tại tại đúng thời điểm

✅ Đã liệt kê toàn bộ **41 FK constraint** trên 28 bảng business (Batch 1: 9, Batch 2: 14 incl. 1 patch, Batch 3: 16 incl. 2 closure, Batch 4: 13 incl. 4 patch — một số đếm trùng giữa batch do patch). Mọi FK target đã tồn tại tại đúng batch nó được tạo/ALTER — xác nhận lại bằng cách đọc theo đúng thứ tự file. Không FK nào trỏ tới bảng chưa tồn tại tại thời điểm migration chạy.

## 2. FK Delete/Update Actions — đúng nguyên tắc CASCADE trong Aggregate, RESTRICT ngoài Aggregate

✅ Toàn bộ 7 quan hệ `CASCADE` đều nằm trong cùng 1 Aggregate Boundary: `roadmap_node.roadmap_id`, `roadmap_node.parent_roadmap_node_id` (Roadmap), `sub_session.learning_session_id` (Learning Session), `evidence_link.evidence_id` (Evidence), `self_assessment_mismatch.discovery_session_id` (Discovery), `recommendation_proposal_response.recommendation_proposal_id` (Recommendation), `roadmap_node_knowledge_node.roadmap_node_id` (phía sở hữu Roadmap của bridge table). Toàn bộ FK còn lại là `RESTRICT` — đặc biệt xác nhận lại **`mentor_session.sub_session_id` = RESTRICT, không CASCADE** (DECISION-031, điểm quan trọng nhất đã verify lại đúng trong SQL). Không phát hiện CASCADE nào vượt Aggregate Boundary.

## 3. Trigger Attachment Completeness — `fn_set_updated_at()`

✅ Đúng cả 9/9 Current State Snapshot table: `learner`, `roadmap`, `roadmap_node`, `learning_session`, `sub_session`, `knowledge_node`, `knowledge_node_mastery`, `discovery_session`, `mentor_session` — mỗi bảng có đúng 1 `BEFORE UPDATE` trigger gọi `fn_set_updated_at()`. Không bảng nào trong 9 bảng này thiếu trigger; không bảng append-only nào bị gắn nhầm trigger này (đã verify — 0 trường hợp).

## 4. `updated_at` Coverage

✅ Trùng với mục 3 — 9/9 bảng có cột `updated_at` đều có trigger tương ứng. Không có bảng nào có cột `updated_at` nhưng thiếu trigger (kiểm tra ngược: scan toàn bộ `CREATE TABLE`, không bảng nào có `updated_at` ngoài 9 bảng này).

## 5. `version_number` Coverage

✅ Đúng 2/2 bảng có cột `version_number`: `learner` (trigger `trg_learner_increment_version_number`), `knowledge_node_mastery` (trigger `trg_knowledge_node_mastery_increment_version_number`). Không bảng nào khác trong 32 bảng có cột `version_number` — xác nhận bằng scan toàn bộ `CREATE TABLE`.

## 6. History Coverage (DECISION-045)

✅ Đúng 4/4 bảng: `learner`→`history.learner`, `knowledge_node`→`history.knowledge_node`, `discovery_session`→`history.discovery_session`, `mentor_session`→`history.mentor_session`. Mỗi history table đã verify lại **column-for-column, đúng thứ tự**, + 1 cột `valid_from` cuối cùng — khớp **Hard Contract** của `fn_write_history()`:

| Bảng | Số cột public.* | Số cột history.* (= public + valid_from) | Khớp thứ tự? |
|---|---|---|---|
| `learner` | 9 | 10 | ✅ |
| `knowledge_node` | 10 | 11 | ✅ |
| `discovery_session` | 11 | 12 | ✅ |
| `mentor_session` | 13 | 14 | ✅ |

Không bảng nào trong 4 bảng thiếu trigger `AFTER UPDATE ... fn_write_history()`. Không history table nào lệch cấu trúc.

## 7. Decision Header Coverage (DECISION-049)

✅ 10/10 Decision Type dùng `decision_header` chung (`ck_decision_header_decision_type` đủ `D1`-`D9b`). 9/10 có Detail riêng:

| Type | Detail path |
|---|---|
| D1 | `teaching_decision_detail` |
| D2 | `assessment_result.decision_header_id` (patch) |
| D3 | `recommendation_proposal.decision_header_id` (patch) |
| D4 | `expansion_record.decision_header_id` (patch) |
| D5 | `local_expansion_decision_detail` |
| D6 | `roadmap_mapping_decision_detail` |
| D7 | `self_assessment_mismatch.decision_header_id` (patch) |
| D8 | (không Detail — Runtime Reconstruction, đúng thiết kế) |
| D9a | `stuck_detection_decision_detail` |
| D9b | `intervention_decision_detail` |

Không Detail nào thiếu, không Detail thừa cho D8.

## 8. TraceLink Compatibility

✅ `source_type` hiện có 6 giá trị (3 baseline + 3 từ Batch 4): `assessment_result`, `recommendation_proposal`, `local_expansion`, `teaching_decision_detail`, `local_expansion_decision_detail`, `stuck_detection_decision_detail`. `target_type` có 3 giá trị baseline, **không đổi từ Batch 2**: `evidence`, `assessment_result`, `discovery_session`.

🟡 **H-10 vẫn mở** — `target_type` thiếu `self_assessment_mismatch`. **Không tự đóng ở Batch 5** — đóng nó đòi hỏi quyết định 1 tên giá trị mới (1 Decision mới), vi phạm trực tiếp ràng buộc "Do NOT introduce new decisions" của round này. Giữ nguyên là quyết định đúng, không phải bỏ sót.

## 9. Enum Consistency

✅ `created_by_actor_type`/`updated_by_actor_type` — đúng `('learner', 'backend_core', 'ai_service')` trên **toàn bộ 28 bảng business có cột này**, không lệch giá trị ở bất kỳ bảng nào (verify từng `CHECK` riêng). `intervention_tier` đúng 2 giá trị đã khóa (DECISION-050 mục 2), không có `direct_fix`. `self_reported_level` đúng 4 giá trị (DECISION-050 mục 4). `action_type` đúng 3 giá trị (DECISION-050 mục 3).

## 10. CHECK Consistency

✅ Mọi cột bắt buộc-không-rỗng dạng text tự do (`summary_reason`, `selection_reasoning`, `expansion_reasoning`, `mapping_reasoning`, `detection_reasoning`, `intervention_reasoning`, `mismatch_reasoning`, `expansion_reason`, `reasoning`) đều có `CHECK (length(trim(...)) > 0)` đi kèm `NOT NULL` — không cột nào chỉ có `NOT NULL` mà thiếu CHECK rỗng. Không phát hiện CHECK nào xung đột logic nội bộ.

## 11. Partial Unique Consistency (DECISION-050 mục 6)

✅ Đúng 3 partial index thường được ACCEPT: `ix_learning_session_learner_id_active`, `ix_sub_session_learning_session_id_active`, `ix_mentor_session_learner_id_active`. 1 partial UNIQUE index khác đã sinh trước đó không thuộc danh sách 4 đề xuất của DECISION-050 mục 6 (`uq_discovery_session_learner_id_active` — open item riêng, không phải 1 trong 4 đề xuất đó, không lẫn lộn). Index thứ 4 đã REJECT — xác nhận **không xuất hiện** ở bất kỳ batch nào. 4 partial unique index `WHERE decision_header_id IS NOT NULL` (Batch 4) nhất quán cùng pattern.

## 12. Index Coverage — mọi cột FK có index khả dụng

🔴 **3 gap xác nhận** (đóng bởi [SQL_BATCH5_COMPLETION.sql](SQL_BATCH5_COMPLETION.sql)):

| Cột FK | Vấn đề | Fix |
|---|---|---|
| `assessment_result.knowledge_node_id` | Chỉ nằm ở vị trí thứ 2 (không leading) của `ix_assessment_result_learner_id_knowledge_node_id` | `CREATE INDEX ix_assessment_result_knowledge_node_id` |
| `knowledge_node_mastery.knowledge_node_id` | Chỉ nằm ở vị trí thứ 2 (không leading) của `uq_knowledge_node_mastery_learner_id_knowledge_node_id` | `CREATE INDEX ix_knowledge_node_mastery_knowledge_node_id` |
| `knowledge_node_mastery.last_assessment_result_id` | Không có index nào — bị sót hoàn toàn ở Batch 2 | `CREATE INDEX ix_knowledge_node_mastery_last_assessment_result_id` |

Mọi cột FK còn lại (đã rà toàn bộ 41 FK constraint ở mục 1) đều có index trực tiếp hoặc là cột leading của 1 UNIQUE/partial-unique index — không gap nào khác.

## 13. Hot-Path Coverage (POSTGRESQL_FEATURE_MATRIX.md mục 4)

✅ Đối chiếu lại toàn bộ 9 Hot Path đã khóa — cả 9 đều có index tương ứng đã sinh đúng trong các batch, không Hot Path nào thiếu. Hot Path #6 (RecommendationProposal đang chờ xử lý) đúng theo kế hoạch dùng `ix_recommendation_proposal_learner_id` + `LEFT JOIN` ở Application Layer, không cần partial index riêng (đã ghi rõ lý do từ Planning — cần JOIN 2 bảng, không thể partial index đơn bảng).

## 14. Migration Ordering

✅ Thứ tự Batch 0 → 1 → 2 → 3 → 4 → 5 không vi phạm phụ thuộc nào — mọi bảng đích của FK/ALTER đã tồn tại trước khi được tham chiếu. Xác nhận lại **0 forward dependency còn mở** (2 closure đã đóng ở Batch 3) và **0 cycle thật** trong toàn bộ 28 bảng business (đúng kết luận gốc của [MIGRATION_DEPENDENCY_GRAPH.md](MIGRATION_DEPENDENCY_GRAPH.md), không thay đổi sau khi SQL thật được sinh).

## 15. Supabase Compatibility

✅ Không phát hiện vấn đề mới — 3 `CREATE INDEX` ở Batch 5 là plain B-Tree index trên cột FK đơn, không có rủi ro lock/rewrite đáng kể ở quy mô Pre-Production hiện tại, không cần `CREATE INDEX CONCURRENTLY` ở giai đoạn này (chưa có dữ liệu thật).

---

## Mandatory Questions

| # | Câu hỏi | Trả lời |
|---|---|---|
| 1 | Tổng số bảng | **32** (28 business + 4 history) |
| 2 | Tổng số history table | **4** — `history.learner`, `history.knowledge_node`, `history.discovery_session`, `history.mentor_session` |
| 3 | Tổng số bảng Decision Persistence | **6 bảng riêng** (`decision_header` + 5 Detail) **+ 4 bảng patch** (`assessment_result`, `recommendation_proposal`, `expansion_record`, `self_assessment_mismatch` — thêm `decision_header_id`, không phải bảng mới) |
| 4 | Số FK còn thiếu | **0** |
| 5 | Số trigger còn thiếu | **0** |
| 6 | Số history attachment còn thiếu | **0** |
| 7 | Số index còn thiếu | **0** sau khi [SQL_BATCH5_COMPLETION.sql](SQL_BATCH5_COMPLETION.sql) chạy (3 trước khi chạy) |
| 8 | Gap explainability còn lại | **1** — H-10 (`trace_link.target_type` thiếu `self_assessment_mismatch`), không chặn, cần 1 Decision mới để đóng |
| 9 | Gap persistence còn lại | **1** — R5-03 (`decision_header_id` trên 4 bảng patch không bị ép buộc NOT NULL cho hàng mới — Application Layer responsibility theo thiết kế, không phải lỗi DB) |
| 10 | Schema blocker còn lại | **0** |
| 11 | Sẵn sàng cho RLS authoring? | **Có** |
| 12 | Sẵn sàng cho Backend implementation? | **Có** (cấu trúc đầy đủ; việc Backend có thực sự ghi vào Decision Persistence layer hay không là vận hành, ngoài phạm vi SQL) |
| 13 | Sẵn sàng cho Migration execution? | **Có**, theo đúng thứ tự Batch 0→1→2→3→4→5 |
| 14 | Sẵn sàng cho Supabase deployment? | **Có** — không phát hiện vấn đề tương thích nào qua cả 5 batch |
| 15 | Sẵn sàng cho Production? | **Có điều kiện** — cần Batch 6 (RLS) trước khi expose qua PostgREST/Supabase API; xem [FINAL_SCHEMA_READINESS_ASSESSMENT.md](FINAL_SCHEMA_READINESS_ASSESSMENT.md) |

## Success Criteria — đối chiếu

| Criteria | Đạt? |
|---|---|
| No missing FK | ✅ |
| No missing trigger | ✅ |
| No missing history attachment | ✅ |
| No unresolved migration dependency | ✅ |

## Liên kết ngược

[SQL_BATCH5_COMPLETION.sql](SQL_BATCH5_COMPLETION.sql), [SQL_BATCH0_INFRASTRUCTURE.sql](SQL_BATCH0_INFRASTRUCTURE.sql), [SQL_BATCH1_IDENTITY_GOAL_ROADMAP.sql](SQL_BATCH1_IDENTITY_GOAL_ROADMAP.sql), [SQL_BATCH2_KNOWLEDGE_EVIDENCE_ASSESSMENT.sql](SQL_BATCH2_KNOWLEDGE_EVIDENCE_ASSESSMENT.sql), [SQL_BATCH3_LEARNING_DISCOVERY_MENTOR_RECOMMENDATION.sql](SQL_BATCH3_LEARNING_DISCOVERY_MENTOR_RECOMMENDATION.sql), [SQL_BATCH4_DECISION_PERSISTENCE.sql](SQL_BATCH4_DECISION_PERSISTENCE.sql), [POSTGRESQL_FEATURE_MATRIX.md](POSTGRESQL_FEATURE_MATRIX.md), [MIGRATION_DEPENDENCY_GRAPH.md](MIGRATION_DEPENDENCY_GRAPH.md), [FINAL_SCHEMA_DEPENDENCY_GRAPH.md](FINAL_SCHEMA_DEPENDENCY_GRAPH.md), [FINAL_SCHEMA_READINESS_ASSESSMENT.md](FINAL_SCHEMA_READINESS_ASSESSMENT.md).

**Next:** Batch 6 — RLS (`ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` cho toàn bộ 32 bảng, theo 5 nhóm RLS đã hoạch định ở [POSTGRESQL_FEATURE_MATRIX.md](POSTGRESQL_FEATURE_MATRIX.md) mục 6). Sau Batch 6: toàn bộ schema vật lý + bảo vệ truy cập hoàn tất.
