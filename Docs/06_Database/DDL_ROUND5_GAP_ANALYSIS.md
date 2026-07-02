# DDL Round 5 Gap Analysis — Mandatory Questions, Gap Closure, What Remains

> **Round:** Post–DDL Round 5 Gap Reassessment. **Scope:** Answer the 15 Mandatory Questions for `decision_header`/Detail design, re-run [DDL_ROUND4_GAP_ANALYSIS.md](DDL_ROUND4_GAP_ANALYSIS.md) against the schema state after [DDL_ROUND5_DESIGN.md](DDL_ROUND5_DESIGN.md) + [DDL_ROUND5_ARCHITECTURE_REVIEW.md](DDL_ROUND5_ARCHITECTURE_REVIEW.md). **No SQL. Review only.**

## 1. Mandatory Questions

**1. Should `decision_header` contain `learner_id`?**
✅ Có — mọi Decision Type trong taxonomy D1-D9b đều gắn 1 Learner cụ thể (không có decision toàn-hệ-thống nào). FK `learner_id → learner(id)`, `RESTRICT`. Đây cũng là điểm khác biệt với `trace_link` (không có `learner_id`, pattern shared/global) — `decision_header` dùng pattern Learner-owned trực tiếp.

**2. Should `decision_header` contain `actor_type`?**
✅ Có — `created_by_actor_type`, enum đóng (`learner`/`backend_core`/`ai_service`), nhất quán Audit Strategy đã áp dụng xuyên Round 1-4.

**3. Should `decision_header` contain `actor_id`?**
✅ Có — `created_by_actor_id`, nullable (cùng lý do mọi bảng khác: không phải actor nào cũng có định danh cụ thể, vd `ai_service` không luôn có 1 `id` đơn lẻ để gán).

**4. How does Header distinguish D1/D5/D6/D9a/D9b/D8 (và D2/D3/D4/D7)?**
Qua cột `decision_type` — enum đóng 10 giá trị (`D1`...`D9b`), neo trực tiếp vào taxonomy đã khóa ở DECISION-048. **Không** dùng `detail_type`/`detail_id` riêng (đã bị loại ở DECISION-049 mục 3) — `decision_type` tự đủ để biết "đây là quyết định loại gì", việc "Detail tương ứng nằm ở bảng nào" được suy ra ở Application Layer (1 bảng tra cứu tĩnh `decision_type → tên bảng Detail`, không cần lưu trong DB vì danh sách 10 loại đã cố định, không động).

**5. Can Header exist before Detail?**
✅ Có — và **bắt buộc phải tồn tại trước hoặc cùng lúc** (Detail trỏ tới Header qua FK NOT NULL, nên Header phải được insert trước trong cùng transaction). Với D8, Header tồn tại **mãi mãi không có Detail nào** — đây là trường hợp hợp lệ duy nhất "Header tồn tại độc lập hoàn toàn".

**6. Can Detail exist without Header?**
❌ Không — `decision_header_id` là `NOT NULL` trên cả 5 Detail mới. (4 Detail cũ — D2/D3/D4/D7 — **có thể** có `decision_header_id IS NULL** cho hàng tạo trước thời điểm DECISION-049 lock, theo đúng quyết định "không bắt buộc backfill"; hàng mới sau lock kỳ vọng luôn có, nhưng không DB-enforced, xem Risk #5 [DDL_ROUND5_DESIGN.md](DDL_ROUND5_DESIGN.md).)

**7. What prevents duplicate Detail records?**
`UNIQUE (decision_header_id)` trên mỗi bảng Detail (5 mới: `uq_teaching_decision_detail_decision_header_id`, v.v.; 4 cũ: partial unique `WHERE decision_header_id IS NOT NULL`) — đảm bảo đúng 0 hoặc 1 Detail / 1 Header trong **cùng 1 bảng Detail**. (Không thể có 1 constraint DB duy nhất đảm bảo "đúng 1 Detail trên toàn bộ 9 bảng Detail" — đây vốn là giới hạn cố hữu của mô hình Approach A/per-capability-table, đã biết từ Round 2-4, không phải thiếu sót mới.)

**8. Which Detail tables require TraceLink?**
`teaching_decision_detail` (D1), `local_expansion_decision_detail` (D5), `stuck_detection_decision_detail` (D9a) — cả 3 cần trỏ tới nguồn dữ liệu cụ thể (Evidence/AssessmentResult/KnowledgeNodeMastery) đã dùng để ra quyết định. `roadmap_mapping_decision_detail` (D6) và `intervention_decision_detail` (D9b) **không cần** — cả 2 đã có FK trực tiếp đơn nhất tới đúng 1 nguồn (`roadmap_node_knowledge_node_id`, `stuck_detection_decision_detail_id`).

**9. Which Detail tables require reason fields?**
**Cả 5/5** — `selection_reasoning` (D1), `expansion_reasoning` (D5), `mapping_reasoning` (D6), `detection_reasoning` (D9a), `intervention_reasoning` (D9b) — mỗi cột đều `NOT NULL` + CHECK không rỗng, nhất quán nguyên tắc Explainability First xuyên mọi Round.

**10. Which Detail tables require confidence values?**
**Không bảng nào** — không có Decision Log nào (DECISION-027/048/049) yêu cầu 1 giá trị confidence số cho D1/D5/D6/D9a/D9b, khác `assessment_result` (đã có `teach_score` từ Round 2, theo yêu cầu riêng DECISION-030). Nếu Founder/ChatGPT sau này muốn thêm, đây là 1 cột bổ sung đơn giản, không đổi cấu trúc — không tự thêm ở Round 5 vì không có yêu cầu nào hậu thuẫn.

**11. Which Detail tables require recommendation payloads (kiểu jsonb không cấu trúc)?**
Chỉ `stuck_detection_decision_detail.signal_payload` — vì thuật toán Stuck Detection chưa chốt (Open Q#6/#11), cần linh hoạt cấu trúc. 4 Detail khác đều dùng FK trực tiếp + text `reasoning`, không cần jsonb vì nội dung đã đủ rõ qua FK tới entity nghiệp vụ cụ thể.

**12. Which Detail tables require knowledge-node references?**
`teaching_decision_detail` (`knowledge_node_id` — nội dung được chọn dạy) và `local_expansion_decision_detail` (`knowledge_node_id` — node được mở rộng).

**13. Which Detail tables require roadmap-node references?**
`roadmap_mapping_decision_detail` — qua `roadmap_node_knowledge_node_id` (gián tiếp tới `roadmap_node` qua bảng nối Round 3, không FK trực tiếp `roadmap_node_id` vì bản thân quyết định D6 là về **Dependency Edge**, không phải RoadmapNode đơn lẻ).

**14. Which Detail tables require mentor-session references?**
Chỉ `teaching_decision_detail` (`mentor_session_id` — quyết định D1 luôn xảy ra trong 1 lượt tương tác cụ thể). `stuck_detection_decision_detail` (D9a) dùng `sub_session_id` (phạm vi rộng hơn 1 lượt), **không** `mentor_session_id` — quyết định có chủ đích: Stuck là tín hiệu tích lũy qua 1 phạm vi nội dung (SubSession), không phải 1 lượt chat đơn lẻ.

**15. What history tables are required under DECISION-045?**
**Không bảng nào** — `decision_header` và toàn bộ 5 Detail mới là append-only/immutable, rơi đúng vào nhóm "Không áp dụng — append-only" của [DatabaseNamingConvention.md](DatabaseNamingConvention.md) mục 9 (cùng nhóm `trace_link`/`self_assessment_mismatch`/`recommendation_proposal`/`expansion_record`). DECISION-045 chỉ yêu cầu History Table cho entity **mutable, không có companion log** — không bảng nào ở Round 5 thuộc nhóm đó.

---

## 2. Gap Closure — GAP-01 / GAP-02 / GAP-05 / D7 / D9

| Gap | Trạng thái trước Round 5 | Trạng thái sau Round 5 | Đóng hoàn toàn? |
|---|---|---|---|
| **GAP-01** (D1 — Teaching, 0% persistence) | Critical, mở từ Round 3.5 | `teaching_decision_detail` + `decision_header` tồn tại, đủ cấu trúc | ✅ **Đóng ở mức cấu trúc** — persistence path đầy đủ end-to-end (mục 8.1, [DDL_ROUND5_ARCHITECTURE_REVIEW.md](DDL_ROUND5_ARCHITECTURE_REVIEW.md)) |
| **GAP-02** (D5 — Local Expansion, không có log lý do) | Critical, mở từ Round 3.5 | `local_expansion_decision_detail` tồn tại | ✅ **Đóng ở mức cấu trúc** — 🟡 giới hạn kế thừa: không trace tới `knowledge_edge` cụ thể (cùng gap `expansion_record` Round 3, chưa đóng, không phải gap mới) |
| **GAP-05** (D6 — Dependency Edge thiếu cột lý do) | High, mở từ Round 3 | `roadmap_mapping_decision_detail` tồn tại, **không sửa** `roadmap_node_knowledge_node` | ✅ **Đóng hoàn toàn** — đây là gap có giải pháp sạch nhất trong 3 gap (FK đơn, không cần TraceLink, không giới hạn kế thừa nào) |
| **D7 persistence** (Discovery) | Đã đóng từ Round 4 (`self_assessment_mismatch`) | Không đổi — chỉ patch thêm `decision_header_id` (nullable) | ✅ Không đổi, vẫn đóng |
| **D9 persistence** (Stuck/Intervention) | Hoàn toàn chưa có (Open Q#6/#11 chặn cả persistence) | `stuck_detection_decision_detail` (D9a) + `intervention_decision_detail` (D9b) tồn tại | 🟡 **Đóng ở mức *nơi lưu*, KHÔNG đóng ở mức *thuật toán*** — xem mục 3 |

**Định nghĩa "đóng ở mức cấu trúc" cần làm rõ:** cả 3 gap (GAP-01/02/05) được đóng theo nghĩa "tồn tại đường dữ liệu DB-level đầy đủ, từ decision xảy ra tới nội dung/lý do, tới (tùy) nguồn dữ liệu cụ thể" — **không** có nghĩa "Application/Backend đã implement, đã có dữ liệu thật". DDL Round 5 là Database Design, không phải Backend Implementation — việc actor (Teaching Capability, Knowledge Graph Domain, Goal & Roadmap Domain) thực sự **ghi** vào các bảng này khi ra quyết định vẫn là công việc Round Backend Implementation, ngoài phạm vi DDL.

---

## 3. Gì vẫn chưa đóng được — D9a/D9b không đóng hoàn toàn được vì lý do gì

`stuck_detection_decision_detail`/`intervention_decision_detail` chỉ giải quyết **"nếu Stuck được phát hiện, lưu nó ở đâu"** — không giải quyết **"Stuck được phát hiện như thế nào"** (Open Question #6/#11, thuật toán/tiêu chí ngưỡng vẫn hoàn toàn mở ở Domain Architecture). Hệ quả cụ thể:

- `signal_payload` (jsonb) không có CHECK cấu trúc nào — không thể CHECK 1 cấu trúc chưa được định nghĩa.
- Không có cột "stuck_score"/"stuck_threshold" cụ thể — vì chưa biết đại lượng nào sẽ được dùng.
- `intervention_tier` (`hint`/`guided_walkthrough`/`direct_fix`) là **suy luận của Claude**, chưa khóa Decision Log — đặc biệt nhạy cảm vì AI_DECISION_MATRIX đã cảnh báo rủi ro leo cấp "nếu intervention = direct fix" liên quan trực tiếp tới ranh giới Human Control Boundary ("AI có được tự sửa code/bài làm của Learner không" — Open Question đã có từ PRD, chưa trả lời).

**Kết luận:** D9a/D9b **không thể "fully explainable" theo nghĩa đầy đủ** cho tới khi Open Question #6/#11 được giải — Round 5 chỉ đảm bảo "khi thuật toán chốt, đã có sẵn nơi lưu kết quả + lý do", không đảm bảo "nội dung được lưu là đúng/đủ ý nghĩa nghiệp vụ".

---

## 4. Cross-check — không lặp lại Architecture Review mục 9, chỉ bổ sung điểm Gap-specific

| Nguồn | Điểm bổ sung ngoài Architecture Review |
|---|---|
| DECISION-027 | Phạm vi gốc (3 nhóm: Mastery/Recommendation/Knowledge Expansion) vẫn không đổi — D1/D6/D9a/D9b nằm ngoài phạm vi DECISION-027 gốc, được đưa vào explainability scope **qua DECISION-048**, không qua sửa DECISION-027 |
| DECISION-038 | Đúng — không thêm Polymorphic FK nào; mở rộng enum `source_type` 3 giá trị, đúng cơ chế đã dùng trước (Round 4 thêm `recommendation_proposal`) |
| DDL_GAP_CONSOLIDATION (gốc, trước Round 4) | H-08 (`history.*` per DECISION-045) — Round 5 xác nhận thêm: **0/6 bảng mới Round 5 cần History Table** — không làm tăng phạm vi H-08, danh sách 4 bảng cần History (`learner`/`knowledge_node`/`discovery_session`/`mentor_session`) **không đổi** |

---

## 5. Remaining Unresolved Issues (sau Round 5)

| ID | Issue | Mức độ | Trạng thái |
|---|---|---|---|
| C-02/C-03 (cũ) | GAP-01/GAP-02 | ~~Critical~~ | ✅ **Hạ cấp — đóng ở mức cấu trúc**, không còn Critical-blocking; vẫn theo dõi (Backend Implementation phải tuân thủ ghi Header+Detail) |
| H-01 (cũ) | GAP-05 | ~~High~~ | ✅ **Đóng hoàn toàn** |
| C-05 (Round 4) | `recommendation_proposal.traced_to[]` "no exception" không DB-enforced | **Critical, không đổi** | Round 5 không chạm `recommendation_proposal` ngoài patch `decision_header_id` — không giải, không làm nặng thêm |
| H-10/H-11 (Round 4) | `trace_link.target_type` thiếu `self_assessment_mismatch`; `evidence.mentor_session_id` thiếu CHECK | **High, không đổi** | Ngoài phạm vi Round 5 |
| **Mới — R5-01** | `intervention_tier` enum chưa khóa Decision Log, liên quan ranh giới "AI tự sửa bài" chưa trả lời (PRD Open Question) | **Medium-High** | Cần Founder xác nhận trước Backend Implementation, không chặn SQL generation |
| **Mới — R5-02** | D9a/D9b thuật toán (Open Q#6/#11) vẫn hoàn toàn mở | **High (đã biết từ trước, không phải phát hiện mới)** | Ngoài phạm vi DDL — Domain/Algorithm Design |
| **Mới — R5-03** | 4 Detail cũ (D2/D3/D4/D7) không có ràng buộc DB nào ép hàng mới phải có Header | **Medium** | Application Layer Discipline, đề xuất trigger chưa thiết kế |
| **Mới — R5-04** | `local_expansion_decision_detail`/`stuck_detection_decision_detail`/`teaching_decision_detail` không trace tới TraceLink (Loại A, không DB-enforced) — tổng điểm Loại A tăng lên 7 | **Medium (đã biết, không Critical)** | Cùng họ GAP-04, chấp nhận được |

**Decision Header mechanism (C-04) đã đóng hoàn toàn** từ DECISION-049 + hiện thực hóa ở Round 5 — không còn xuất hiện trong danh sách trên.

## Liên kết ngược

[DDL_ROUND5_DESIGN.md](DDL_ROUND5_DESIGN.md), [DDL_ROUND5_ARCHITECTURE_REVIEW.md](DDL_ROUND5_ARCHITECTURE_REVIEW.md), [DDL_ROUND4_GAP_ANALYSIS.md](DDL_ROUND4_GAP_ANALYSIS.md), [DECISION_PERSISTENCE_GAP_CLOSURE.md](DECISION_PERSISTENCE_GAP_CLOSURE.md), [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md), [DECISION-049](../11_Decisions/DECISION-049-Decision-Persistence-Mechanism.md).

**Chưa có SQL/`CREATE TABLE`/`CREATE POLICY`/migration nào được tạo. Round 1-4 không bị sửa. Thuật toán Stuck Detection (Open Q#6/#11) vẫn chưa giải — đúng phạm vi được giao cho Round 5 (Design only).**
