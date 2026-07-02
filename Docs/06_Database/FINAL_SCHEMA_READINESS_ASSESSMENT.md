# Final Schema Readiness Assessment

> Đánh giá sẵn sàng cuối cùng sau khi Batch 0-5 đã chạy (32 bảng, schema vật lý hoàn tất ở mức structure). Trả lời 5 câu hỏi sẵn sàng (Mandatory Questions 11-15 của [SQL_BATCH5_REVIEW.md](SQL_BATCH5_REVIEW.md)) với chi tiết đầy đủ.

## 1. Sẵn sàng cho RLS authoring? ✅ Có

5 nhóm RLS đã hoạch định ở [POSTGRESQL_FEATURE_MATRIX.md](POSTGRESQL_FEATURE_MATRIX.md) mục 6 (0-hop Learner-owned, 1-hop, 2-hop, 3-hop, Shared/Global) — đếm lại đúng 28/28 bảng business đã được phân nhóm, không bảng nào thiếu `learner_id` truy ngược được (trực tiếp hoặc qua đúng 1-3 hop FK) ngoại trừ nhóm Shared/Global (`knowledge_node`, `knowledge_edge`, `trace_link`, `decision_header` — chờ xác nhận decision_header có nên là Learner-owned 1-hop qua `learner_id` trực tiếp, vì nó **có** `learner_id` riêng, khác các Detail). Không có bảng mới nào (Batch 4-5) làm thay đổi cấu trúc 5 nhóm đã hoạch định — `decision_header` + 5 Detail + 4 cột patch đều có đường truy ngược `learner_id` rõ ràng (trực tiếp hoặc qua FK 1 hop).

## 2. Sẵn sàng cho Backend implementation? ✅ Có (với 1 lưu ý vận hành)

Toàn bộ 9 đường explainability (D1-D9b) đã có **cấu trúc lưu trữ đầy đủ** — không bảng nào còn thiếu cột/FK cần để Backend ghi dữ liệu. Lưu ý vận hành (không phải lỗi schema):
- GAP-01/02/05 đã đóng **ở mức cấu trúc** từ Batch 4 — Backend phải thực sự ghi vào `teaching_decision_detail`/`local_expansion_decision_detail`/`roadmap_mapping_decision_detail`, schema không tự đảm bảo điều này.
- R5-03: `decision_header_id` trên 4 bảng patch là nullable vĩnh viễn — Backend phải tự đảm bảo luôn ghi nó cho hàng mới từ nay, DB không ép buộc.
- D9a (Stuck Detection) có đường lưu trữ nhưng thuật toán phát hiện chưa khóa (Open Question #6/#11) — `signal_payload` là `jsonb` không cấu trúc, chờ quyết định riêng.

## 3. Sẵn sàng cho Migration execution? ✅ Có

Thứ tự `Batch 0 → 1 → 2 → 3 → 4 → 5` đã xác nhận **0 cycle, 0 forward dependency còn mở** ([FINAL_SCHEMA_DEPENDENCY_GRAPH.md](FINAL_SCHEMA_DEPENDENCY_GRAPH.md)). Mọi statement dùng `IF NOT EXISTS`/`OR REPLACE` ở Batch 0 (idempotent); Batch 1-5 là `CREATE TABLE`/`ALTER TABLE` một lần, chạy đúng thứ tự là đủ — không cần `DEFERRABLE` FK, không cần multi-pass.

## 4. Sẵn sàng cho Supabase deployment? ✅ Có

Không phát hiện vấn đề tương thích nào qua toàn bộ 6 batch:
- `auth.users` FK trên `learner.id` đúng pattern Supabase (DECISION-043).
- Schema `history` đã khóa qua `REVOKE ALL ... FROM PUBLIC` — không lộ qua PostgREST dù API expose-schema list có cấu hình sai.
- Mọi `jsonb`, `numeric(p,s)`, partial index, `gen_random_uuid()` đều native, không cần extension ngoài `pgcrypto` (đã enable, vốn cũng đã có sẵn theo default trên mọi project Supabase).
- 3 `CREATE INDEX` của Batch 5 không rủi ro lock ở quy mô Pre-Production hiện tại.

## 5. Sẵn sàng cho Production? 🟡 Có điều kiện

**Chưa đủ điều kiện ngay** — cần hoàn thành trước khi đi Production:

| Điều kiện | Trạng thái |
|---|---|
| Batch 6 — RLS (`ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` cho 32 bảng) | ❌ Chưa chạy — schema hiện tại **không có RLS nào**, mọi bảng `public.*` đang mở hoàn toàn nếu lộ qua PostgREST với policy mặc định "không RLS = full access cho role có GRANT" |
| Backend thực sự ghi Decision Persistence layer (D1/D5/D6 qua Detail, D2/D3/D4/D7 qua patch) | ❌ Ngoài phạm vi SQL — vận hành |
| Quyết định thuật toán Stuck Detection (Open Q#6/#11) | ❌ Chưa khóa — không chặn schema, chặn tính năng D9a/D9b thật |

**Không phải schema blocker** (an toàn để giữ mở, không cần Decision mới trước Production):
- H-10 (`trace_link.target_type` thiếu `self_assessment_mismatch`) — gap explainability nhỏ, không gây lỗi dữ liệu.
- H-11 (`evidence.mentor_session_id` thiếu CHECK ràng buộc với `source_type`) — rủi ro data-quality nhỏ, Application Layer có thể tự kiểm tra.
- C-05 (`recommendation_proposal.traced_to[]` "no exception" không DB-enforced) — đã biết từ đầu, ngoài phạm vi DB theo thiết kế.
- Các CHECK danh sách mở (`domain_category`, `relation_type`, `expansion_class`, v.v.) — chờ PRD xác nhận phạm vi MVP, mở rộng sau chỉ cần `ALTER ... DROP/ADD CONSTRAINT`, không đổi cấu trúc bảng.

## Tổng kết

| Hạng mục | Trạng thái |
|---|---|
| Schema vật lý (32 bảng, FK, trigger, history, index) | ✅ Hoàn tất |
| RLS | ❌ Batch 6, chưa chạy |
| Production-ready | 🟡 Có điều kiện — chặn bởi RLS, không chặn bởi bất kỳ vấn đề cấu trúc nào |

## Liên kết ngược

[SQL_BATCH5_REVIEW.md](SQL_BATCH5_REVIEW.md), [FINAL_SCHEMA_DEPENDENCY_GRAPH.md](FINAL_SCHEMA_DEPENDENCY_GRAPH.md), [POSTGRESQL_FEATURE_MATRIX.md](POSTGRESQL_FEATURE_MATRIX.md), [DECISION-049](../11_Decisions/DECISION-049-Decision-Persistence-Mechanism.md), [DECISION-050](../11_Decisions/DECISION-050-SQL-PreGeneration-Finalization.md).

**Next:** Batch 6 — RLS (`ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` cho toàn bộ 32 bảng, theo 5 nhóm đã hoạch định).
