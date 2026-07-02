# SQL Batch 3 Review — Learning Session + Discovery + Mentor + Recommendation

> Review của [SQL_BATCH3_LEARNING_DISCOVERY_MENTOR_RECOMMENDATION.sql](SQL_BATCH3_LEARNING_DISCOVERY_MENTOR_RECOMMENDATION.sql). Đối chiếu [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md) mục 1.6-1.8, [DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md), [DECISION-006](../11_Decisions/DECISION-006-Roadmap-Governance.md), [DECISION-028](../11_Decisions/DECISION-028-Learning-Session-Domain.md), [DECISION-031](../11_Decisions/DECISION-031-SubSession-vs-MentorSession.md), [DECISION-032](../11_Decisions/DECISION-032-Immutable-Goal.md), [DECISION-033](../11_Decisions/DECISION-033-Adaptive-Pause.md), [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md), [DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md), [DECISION-050](../11_Decisions/DECISION-050-SQL-PreGeneration-Finalization.md).

## 0. Bổ sung 2 bảng `history.*` ngoài danh sách bảng được giao tường minh

Task chỉ liệt kê 8 bảng — **không** liệt kê `history.discovery_session`/`history.mentor_session`. Tuy nhiên [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md) **khóa cứng** đúng 4 bảng cần History Table: `learner`, `knowledge_node` (đã tạo ở Batch 1/2), và **`discovery_session`, `mentor_session`** — cả 2 đều được tạo lần đầu ở batch này. Bỏ qua 2 bảng `history.*` này sẽ để schema vi phạm 1 Decision đã khóa ngay khi `discovery_session`/`mentor_session` vừa được tạo ra — không phải lựa chọn an toàn để "theo đúng literal danh sách". **Quyết định: sinh thêm cả 2**, ghi nhận rõ lý do trong cả file SQL và Review này, không âm thầm mở rộng phạm vi mà không giải trình.

---

## 1. Learning Session Aggregate Integrity

✅ `learning_session` (Root, Boundary 11) → `sub_session` (Child, `CASCADE`) → `learning_session_transition` (Supporting Persistence Entity, companion log, `RESTRICT` — không phải con Aggregate thật, chỉ tham chiếu). `uq_learning_session_goal_id` đúng 1:1 với `goal` (DECISION-028/032). `ck_sub_session_scope_exactly_one` đảm bảo đúng 1 trong 2 phạm vi (`roadmap_node_id`/`knowledge_node_id`) — **giờ đã hoàn chỉnh thật** (không còn "chưa hoàn chỉnh tới khi có FK thật" như ghi chú gốc ở Round 1, vì FK `knowledge_node_id` đã đóng ở cuối batch này).

## 2. Discovery Aggregate Integrity

✅ `discovery_session` (Root, Boundary 8) → `self_assessment_mismatch` (Child, `CASCADE`). FK `actual_assessment_result_id → assessment_result` đúng `RESTRICT`, nullable (so sánh có thể dựa trực tiếp Evidence, không bắt buộc qua `assessment_result`). Không phát hiện Ownership Conflict — `self_assessment_mismatch` vẫn write-owner Discovery Domain dù FK tham chiếu `assessment_result` (Assessment Domain).

## 3. Mentor Aggregate Integrity

✅ `mentor_session` (Root, Boundary 9, **standalone**) — **không** là con của `sub_session`. `fk_mentor_session_sub_session_id` đúng `ON DELETE RESTRICT` (không `CASCADE`) — đây là điểm quan trọng nhất của batch này để làm đúng: nếu dùng `CASCADE`, archive 1 `sub_session` sẽ xóa luôn lịch sử tương tác Mentor đã xảy ra, **vi phạm trực tiếp** [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 6 ("Archive độc lập"). Đã verify đúng trong SQL.

## 4. Recommendation Aggregate Integrity

✅ `recommendation_proposal` (Root, Boundary 10, standalone) — append-only, không `updated_at`. `action_type` đúng 3 giá trị đã khóa ở [DECISION-050](../11_Decisions/DECISION-050-SQL-PreGeneration-Finalization.md) mục 3, không thêm/bớt. Không FK trực tiếp tới `goal`/`roadmap` — đúng thiết kế (mọi liên kết qua `payload` jsonb hoặc `trace_link`, không FK vật lý).

## 5. Recommendation Response Append-Only Behavior

✅ `recommendation_proposal_response` append-only, `CASCADE` trong Aggregate (Boundary 10). `uq_recommendation_proposal_response_recommendation_proposal_id` (`UNIQUE` đầy đủ, không partial) thực thi đúng **"1-time transition"** — không cho phép 2 phản hồi cho cùng 1 đề xuất, đúng Logical Model lifecycle ("Confirmed | Ignored, 1-time transition, recorded as an additional fact, not in-place update"). Không có cách nào ở Application Layer "đổi ý" mà không vi phạm constraint này.

## 6. Deferred FK Closure Correctness

| Closure | Bảng nguồn tồn tại? | Bảng đích tồn tại? | Thứ tự đúng? |
|---|---|---|---|
| `sub_session.knowledge_node_id → knowledge_node` | ✅ (bước 2, batch này) | ✅ (Batch 2) | ✅ — `ALTER` chạy sau khi cả 2 đã tồn tại |
| `evidence.mentor_session_id → mentor_session` | ✅ (Batch 2) | ✅ (bước 7, batch này) | ✅ — `ALTER` chạy sau `mentor_session`, đúng thứ tự trong file |

**Không có closure ALTER nào khác được sinh** — đúng yêu cầu "chỉ sinh nếu đã được DDL Design chỉ định". `trace_link` **không cần ALTER enum** ở batch này: `'recommendation_proposal'` (source_type) và `'discovery_session'` (target_type) **đã có sẵn trong CHECK list gốc từ Batch 2** (baseline Round 1-2 đã pre-anticipate 2 giá trị này trước khi bảng tương ứng tồn tại — xem [SQL_BATCH2_KNOWLEDGE_EVIDENCE_ASSESSMENT.sql](SQL_BATCH2_KNOWLEDGE_EVIDENCE_ASSESSMENT.sql) mục 9) — đã verify lại CHECK constraint gốc, không cần sửa.

**Sau batch này: 0 forward dependency nào còn mở trong toàn schema** (cả 2 closure đã biết từ Round 1-4 đều đã đóng).

## 7. Explainability Alignment (DECISION-027 / 038 / 048)

| Decision Type | Đường explainability | Đầy đủ sau Batch 3? |
|---|---|---|
| D3 (Recommendation) | `recommendation_proposal` → `trace_link` (source_type đã sẵn) → Evidence/AssessmentResult/DiscoverySession | ✅ Đủ cấu trúc (DECISION-027/038) |
| D7 (Discovery) | `self_assessment_mismatch.mismatch_reasoning` (CHECK not empty) + FK `knowledge_node_id`/`actual_assessment_result_id` | ✅ Đủ |
| D8 (Mode Selection) | `mentor_session.learning_mode` — **không có Detail riêng ở batch này** (D8 dùng Runtime Reconstruction, đúng DECISION-048 — Decision Header cho D8 sinh ở Batch 4, không phải batch này) | 🟡 Đúng theo kế hoạch — chưa đầy đủ tới Batch 4 |
| D9 (Pause qua Recommendation) | `recommendation_proposal.action_type = 'pause_learning_session'` → `recommendation_proposal_response` → (nếu confirmed) `learning_session_transition` | ✅ Đủ |

**Không phát hiện Explainability Conflict nào** — đúng đúng tiến độ đã hoạch định (D1/D5/D6/D9a/D9b/Header chờ Batch 4).

## 8. Versioning Strategy

✅ **Không bảng nào trong Batch 3 có `version_number`** — đúng, không bảng nào trong 8 bảng này được DECISION-044 liệt kê (`knowledge_node_mastery` mandatory, `learner` optional-applied, cả 2 đã xử lý ở Batch 1/2). `learning_session`/`sub_session`/`discovery_session`/`mentor_session` là Snapshot nhưng bảo vệ qua companion log (`learning_session_transition`, History Table) — không qua versioning, đúng thiết kế.

## 9. History Strategy

✅ `history.discovery_session`/`history.mentor_session` — đúng Hard Contract (mirror cột + `valid_from`, không PK — cùng lý do `now()` đóng băng trong transaction đã ghi nhận từ Batch 1). `learning_session`/`sub_session` **đúng không có History Table** — bảo vệ qua `learning_session_transition` (companion log, DECISION-045). `self_assessment_mismatch`/`recommendation_proposal`/`recommendation_proposal_response` **đúng không có History Table** — append-only, tự là lịch sử đầy đủ.

## 10. Supabase Compatibility

| Điểm | Đánh giá |
|---|---|
| `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY` (2 closure) | Cú pháp chuẩn, không lock table quá lâu ở quy mô dữ liệu nhỏ (chưa có dữ liệu thật ở giai đoạn Pre-Production) — không cần `NOT VALID`/`VALIDATE CONSTRAINT` tách rời ở giai đoạn này |
| Partial Unique Index `uq_discovery_session_learner_id_active` | Lần dùng thứ 2 (sau `roadmap_node_knowledge_node` ở Batch 2) — không phát hiện vấn đề |
| 3 Partial Index thường (`ix_learning_session_learner_id_active`, `ix_sub_session_learning_session_id_active`, `ix_mentor_session_learner_id_active`) | Đúng 3 index đã ACCEPT ở [DECISION-050](../11_Decisions/DECISION-050-SQL-PreGeneration-Finalization.md) mục 6 — sinh đủ, không thiếu, không thừa (index thứ 4 đã REJECT không xuất hiện) |
| FK tới `assessment_result`/`knowledge_node`/`mentor_session` (cùng batch hoặc Batch 2) | Đều tồn tại đúng thời điểm cần |

**Không phát hiện vấn đề tương thích Supabase nào.**

---

## 11. Open Items kế thừa từ Design — chưa được Decision Log khóa cứng

| Constraint | Bảng | Trạng thái |
|---|---|---|
| `uq_discovery_session_learner_id_active` | `discovery_session` | Đề xuất ("1 Discovery Session active/Learner"), chưa khóa — DECISION-050 không xét lại open item này |

**Chỉ 1 open item còn lại trong batch này** — mọi enum khác (`action_type`, `self_reported_level`) đã được [DECISION-050](../11_Decisions/DECISION-050-SQL-PreGeneration-Finalization.md) khóa cứng trước khi batch này được sinh.

## Liên kết ngược

[SQL_BATCH3_LEARNING_DISCOVERY_MENTOR_RECOMMENDATION.sql](SQL_BATCH3_LEARNING_DISCOVERY_MENTOR_RECOMMENDATION.sql), [SQL_BATCH2_REVIEW.md](SQL_BATCH2_REVIEW.md), [SQL_BATCH1_REVIEW.md](SQL_BATCH1_REVIEW.md), [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md), [DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md), [MIGRATION_DEPENDENCY_GRAPH.md](MIGRATION_DEPENDENCY_GRAPH.md), [DECISION-049](../11_Decisions/DECISION-049-Decision-Persistence-Mechanism.md), [DECISION-050](../11_Decisions/DECISION-050-SQL-PreGeneration-Finalization.md).

**Next:** Batch 4 — Decision Persistence (`decision_header` + 5 Detail tables D1/D5/D6/D9a/D9b + 4 `decision_header_id` patches lên `assessment_result`/`recommendation_proposal`/`expansion_record`/`self_assessment_mismatch` + `trace_link` enum rename theo DECISION-050 mục 5), sau đó Batch 5 (RLS).
