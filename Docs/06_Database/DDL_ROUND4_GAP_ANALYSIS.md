# DDL Round 4 Gap Analysis — What Remains Missing After Round 4

> **Round:** Post–DDL Round 4 Gap Reassessment. **Scope:** Re-run [DDL_GAP_CONSOLIDATION.md](DDL_GAP_CONSOLIDATION.md) against the schema state after [DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md) + [DDL_ROUND4_ARCHITECTURE_REVIEW.md](DDL_ROUND4_ARCHITECTURE_REVIEW.md). **No SQL. Review only.**

## 0. Severity Definitions (kế thừa nguyên trạng [DDL_GAP_CONSOLIDATION.md](DDL_GAP_CONSOLIDATION.md) mục 0)

| Level | Meaning for SQL generation |
|---|---|
| **Critical** | Blocks **full schema** or **violates locked Decision** if ignored |
| **High** | Must resolve before production or before affected capability ships |
| **Medium** | Should resolve; workaround exists |
| **Low** | Track; does not block generation |

---

## 1. Đã đóng ở Round 4 (đối chiếu ngược [DDL_GAP_CONSOLIDATION.md](DDL_GAP_CONSOLIDATION.md))

| ID gốc | Gap | Trạng thái sau Round 4 |
|---|---|---|
| **C-01** | 4 core entity thiếu (`mentor_session`, `discovery_session`, `self_assessment_mismatch`, `recommendation_proposal`) | ✅ **Đóng** — cả 4 đã thiết kế, + `recommendation_proposal_response` mới (đóng thêm M-12) |
| **H-04** | `evidence.mentor_session_id` — FK blocked, OQ-2 | ✅ **Đóng** — FK thêm, giữ nullable, OQ-2 trả lời "tùy chọn" |
| **H-05** | `SubSession ↔ MentorSession` chưa thiết kế | ✅ **Đóng** — `mentor_session.sub_session_id`, `RESTRICT` xuyên Aggregate |
| **M-02** | `sub_session.knowledge_node_id` chưa có FK thật | ✅ **Đóng** — FK thêm, `RESTRICT` |
| **M-12** | Recommendation confirmed/ignored — shape chưa quyết | ✅ **Đóng** — `recommendation_proposal_response`, UNIQUE 1/proposal |
| **M-01** | Recommendation thiếu Discovery signal | ✅ **Đóng gián tiếp** — `self_assessment_mismatch` nay tồn tại, signal có nơi đọc |

**6 gap đã đóng.** Không gap nào trong nhóm này phát sinh tác dụng phụ ngoài dự kiến — đối chiếu chi tiết ở [DDL_ROUND4_ARCHITECTURE_REVIEW.md](DDL_ROUND4_ARCHITECTURE_REVIEW.md) mục 9.

---

## 2. Critical (sau Round 4)

| ID | Gap / risk | Nguồn | Thay đổi so với trước Round 4? |
|---|---|---|---|
| C-02 | **GAP-01** — D1 Teaching có 0% persistence | EXPLAINABILITY_GAP_ANALYSIS | **Không đổi** — ngoài phạm vi Round 4 theo chỉ định, vẫn treo |
| C-03 | **GAP-02** — D5 Local Expansion không có nơi lưu lý do nội bộ | DECISION-027/048 vs DDL | **Không đổi** — ngoài phạm vi Round 4, vẫn treo |
| C-04 | **Decision Header mechanism chưa chọn** | SHARED_DECISION_PERSISTENCE_REVIEW | **Không đổi** — ngoài phạm vi Round 4 theo chỉ định, vẫn treo |
| **C-05 (mới)** | **`recommendation_proposal.traced_to[]` "no exception" (DECISION-027) không có DB-level enforcement** | [DDL_ROUND4_ARCHITECTURE_REVIEW.md](DDL_ROUND4_ARCHITECTURE_REVIEW.md) mục 5 | **Mới phát hiện ở Round 4** — nâng cấp từ "Loại A đã biết" (Round 2) lên Critical vì đây là điểm **duy nhất** mà chính Decision Log dùng từ "no exception", trong khi cơ chế triển khai (`trace_link` đa hình) về bản chất không enforce được bằng CHECK/FK đơn |

**3/4 Critical không đổi vì cố ý ngoài phạm vi (đúng chỉ định task: không giải GAP-01/GAP-02, không thiết kế Decision Header). 1 Critical mới phát sinh, đặc thù của `recommendation_proposal` — không tồn tại trước Round 4 vì bảng chưa tồn tại.**

---

## 3. High (sau Round 4)

| ID | Gap / risk | Nguồn | Trạng thái |
|---|---|---|---|
| H-01 | `roadmap_node_knowledge_node` thiếu cột lý do (D6) | ROUND3_ARCHITECTURE_REVIEW | Không đổi — ngoài phạm vi Round 4 |
| H-02 | `assessment_result` cần `trace_link` nhưng không CHECK | ROUND2/3 reviews | Không đổi |
| H-03 | GAP-07 — Application-layer integrity rải rác | EXPLAINABILITY_GAP_ANALYSIS | **Mở rộng phạm vi** — nay gồm cả `recommendation_proposal`↔`trace_link` (mục C-05 trên) |
| H-06 | D9a/D9b — Stuck/Intervention mechanism | EVENT_CATALOG, AI_DECISION_MATRIX | Không đổi — ngoài phạm vi |
| H-07 | D8 Runtime Reconstruction inputs chưa verify | DECISION-048 | Không đổi |
| H-08 | `history.*` tables — Decision đã có (DECISION-045), **nhưng chưa hiện thực hóa thành SQL nào** | DECISION-045 | 🟡 **Một phần đổi** — phạm vi đã rõ ràng hơn: `history.learner`, `history.knowledge_node` (Round 1-2), `history.discovery_session`, `history.mentor_session` (Round 4) — **4/4 bảng cần History đã được xác định đầy đủ ở tầng Design**, nhưng **0/4 đã có SQL/trigger thực tế** (đúng kỳ vọng — task không yêu cầu SQL) |
| H-09 | `ExpansionRecord ↔ KnowledgeEdge` cardinality | DDL R3 Risk #1 | Không đổi |
| **H-10 (mới)** | **`trace_link.target_type` chưa bao gồm `self_assessment_mismatch`** | [DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md) Risk #2 | Mới — cần mở rộng enum CHECK trước khi `recommendation_proposal` có thể trace trực tiếp tới 1 mismatch cụ thể |
| **H-11 (mới)** | **`evidence.mentor_session_id` không có CHECK ràng buộc với `source_type`** | [DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md) Risk #5 | Mới — `evidence` đã "xong" từ Round 2, patch FK ở Round 4 không tự mở rộng CHECK ngoài phạm vi bảng |

---

## 4. Medium (sau Round 4)

Kế thừa M-03 đến M-11 từ [DDL_GAP_CONSOLIDATION.md](DDL_GAP_CONSOLIDATION.md) **không đổi** (ngoài phạm vi Round 4, không phải bảng Round 4 chạm tới), cộng:

| ID | Gap / risk | Nguồn |
|---|---|---|
| M-12 | ~~Recommendation confirmed/ignored shape~~ | **Đã đóng** — xem mục 1 |
| **M-13 (mới)** | `uq_discovery_session_learner_id_active` chưa được Domain Architecture xác nhận là invariant thật | [DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md) Risk #4 |
| **M-14 (mới)** | `recommendation_proposal.action_type` / `self_assessment_mismatch.self_reported_level` — danh sách enum suy luận của Claude, chưa khóa Decision Log | [DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md) Risk #3 |
| **M-15 (mới)** | `mentor_session ↔ assessment_result` không có FK trực tiếp, chỉ gián tiếp qua `evidence` | [DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md) mục 3, Risk #1 |

---

## 5. Low — không đổi từ [DDL_GAP_CONSOLIDATION.md](DDL_GAP_CONSOLIDATION.md) mục 4 (L-01..L-06), cộng:

| ID | Gap / risk |
|---|---|
| **L-07 (mới)** | `recommendation_proposal_response` không cho phép "đổi ý" (UNIQUE 1 row/proposal) — đúng theo Logical Model, nhưng là quyết định khó đảo ngược nếu sau này cần |

---

## 6. Open Questions — trạng thái sau Round 4

| # | Question | Trạng thái |
|---|---|---|
| OQ-2 | `evidence.mentor_session_id` bắt buộc hay không? | ✅ **Đã đóng** — tùy chọn (nullable) |
| OQ-4 | `knowledge_node` cần version/history? | Không đổi — ngoài phạm vi Round 4 |
| OQ-6 / OQ-11 | Stuck Detection (D9a/D9b) | Không đổi |
| — | Decision Header Approach A/B/C | Không đổi — cố ý ngoài phạm vi |
| — | GAP-01/02 resolution | Không đổi — cố ý ngoài phạm vi |
| — | `ExpansionRecord ↔ KnowledgeEdge` cardinality | Không đổi |
| **(mới)** | **PRD OpenQuestions #5** — cơ chế xác minh `self_assessment_mismatch` cụ thể | **Vẫn mở** — Round 4 chỉ thiết kế **nơi lưu kết quả**, không quyết định **thuật toán phát hiện** |
| **(mới)** | `trace_link.target_type` có cần mở rộng `self_assessment_mismatch`? | Mới mở — xem H-10 |
| **(mới)** | `ck_evidence_mentor_session_id_consistency` — thêm hay không? | Mới mở — xem H-11 |
| **(mới)** | `recommendation_proposal.traced_to[]` "no exception" — enforce bằng trigger hay quy trình? | Mới mở — xem C-05 |

---

## 7. Missing Mechanisms (non-table) — không đổi từ [DDL_GAP_CONSOLIDATION.md](DDL_GAP_CONSOLIDATION.md) mục 6

| Mechanism | Required by | Status |
|---|---|---|
| Decision Header + Detail registry | DECISION-048, D1/D6/D7/D9 | **Vẫn chưa thiết kế** — ngoài phạm vi Round 4 |
| Explainability Integrity Service | GAP-07 | Architecture only — phạm vi mở rộng (mục C-05/H-10/H-11) |
| History trigger function (generic) | DECISION-045 | Thiết kế đã đủ rõ (4 bảng đích xác định) — **chưa viết trigger SQL** |
| `version_number` BEFORE UPDATE triggers | DECISION-044 | Không áp dụng cho bảng Round 4 (không bảng nào dùng `version_number` bắt buộc) |
| Discovery Mismatch Detection Algorithm | PRD OpenQuestions #5 | **Không có persistence riêng nào — đây là logic Application/AI Layer, không phải gap DB** |

---

## 8. What Blocks Full Schema Now?

| Blocker type | Items | Effect |
|---|---|---|
| **Hard block — explainability complete** | C-02 (D1), C-03 (D5), C-04 (Decision Header), **C-05 (traced_to enforcement)** | Cannot ship affected AI features with full guarantee |
| **Soft block — quality** | H-01, H-10, H-11, M-13, M-14 | Can generate SQL but should patch design/enum lists first |
| **Non-blocker** | H-02/03/06/07/09, M-03..M-11/M-15, Low | Application/ops concerns |

### SQL generation gate matrix (cập nhật)

| Batch | Can generate? | Conditions |
|---|---|---|
| DDL R1 (8 bảng) | ✅ Yes | Không đổi |
| DDL R2 (7 bảng) | ✅ Yes | Không đổi |
| DDL R3 (2 bảng) | ✅ Yes | Không đổi |
| **DDL R4 (5 bảng + 2 FK patch)** | ✅ **Yes** | Per [DDL_ROUND4_ARCHITECTURE_REVIEW.md](DDL_ROUND4_ARCHITECTURE_REVIEW.md) READY_FOR_SQL_GENERATION — khuyến nghị xác nhận 5 điểm mở trước (xem mục đó) |
| Forward FK patch | ✅ **Yes — hoàn tất** | Cả 2 forward dependency cuối cùng (`sub_session.knowledge_node_id`, `evidence.mentor_session_id`) đã đóng — **không còn forward dependency nào treo** |
| History schema (4 bảng) | ⚠️ Partial | Thiết kế đã đủ rõ 4/4 bảng đích (`learner`,`knowledge_node`,`discovery_session`,`mentor_session`) — trigger SQL vẫn chưa viết (ngoài phạm vi mọi Round tới giờ, cố ý) |
| Decision Header | ❌ No | Mechanism pending — ngoài phạm vi |
| D1/D5 log entities | ❌ No | Founder decision pending — ngoài phạm vi |

---

## 9. Mandatory Questions

**1. Are all logical entities now represented?**
✅ Có — toàn bộ entity đã khóa ở [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 1 (18 entity gốc + `ExpansionRecord`/`ApprovalRecord`/`LearningSessionTransition` đã approve trước) nay đều có bảng tương ứng, cộng `recommendation_proposal_response` (Supporting Persistence Entity mới, không phải Core Entity).

**2. Are all aggregate roots represented?**
✅ Có — 10 Boundary đã liệt kê xuyên Round 1-4 (Boundary 1-10) đều có Root tương ứng tồn tại trong DDL. Không Boundary nào còn thiếu Root.

**3. Are all core domains represented?**
✅ Có — 7 Core Domain ở [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) (Identity/Goal&Roadmap/Knowledge Graph/Mastery&Evidence/Discovery/Mentor Interaction/Learning Profile-as-projection) nay đều có ít nhất 1 bảng write-owner, cộng Recommendation Domain (Domain #8, đã có từ CoreDomainMap nhưng chưa có bảng tới Round 4). `LearningProfile` **đúng đắn không có bảng riêng** — là projection, không persist (DECISION-036, đã xác nhận từ trước).

**4. Are any new entities required?**
❌ Không — 4 entity Core được giao đã đủ để đóng C-01. Không phát hiện entity Core nào khác còn thiếu ngoài 4 đã giao + Decision Header (cố ý ngoài phạm vi Round 4).

**5. Are any new supporting entities required?**
🟡 Một phần — `recommendation_proposal_response` đã được thêm ở Round 4 (cần thiết để đóng M-12 đúng nguyên tắc append-only). **Không phát hiện Supporting Entity nào khác còn thiếu** cho phạm vi đã giao — nhưng Decision Header (khi được thiết kế ở Round sau) gần như chắc chắn sẽ cần ≥1 Supporting Entity mới (`decision_header`/`decision_detail` theo đề xuất Approach C ở SHARED_DECISION_PERSISTENCE_REVIEW.md).

**6. Does mentor_session belong under sub_session?**
❌ Không — và đây là điểm quan trọng nhất Round 4 phải làm đúng. Theo DECISION-031, `mentor_session` **không** thuộc Aggregate của `sub_session` — nó là Root độc lập (Boundary 9), chỉ được **tham chiếu** (FK `RESTRICT`, không `CASCADE`). "Thuộc dưới" về mặt Domain Model (hierarchy 3 tầng khái niệm) ≠ "thuộc Aggregate" về mặt Database Design — 2 khái niệm khác nhau, đã phân biệt rõ ở [DDL_ROUND4_ARCHITECTURE_REVIEW.md](DDL_ROUND4_ARCHITECTURE_REVIEW.md) mục 1-4.

**7. Does recommendation_proposal satisfy DECISION-027?**
🟡 Một phần — thỏa **cấu trúc** (mọi đề xuất có thể trace qua `trace_link.source_type='recommendation_proposal'`, enum đã sẵn từ Round 2), nhưng **chưa thỏa "no exception" ở mức DB enforcement** — xem C-05 mục 2. Cần quyết định Founder/Lead Architect về mức enforcement chấp nhận được.

**8. Does discovery_session satisfy Domain #7?**
⚠️ Cần đính chính: theo [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) (đã dẫn lại ở research Round 4), Discovery là **Domain #6**, không phải #7 — **Domain #7 là Mentor Interaction**. Với cách hiểu đúng: `discovery_session`/`self_assessment_mismatch` ✅ thỏa đầy đủ Domain #6 (Discovery); `mentor_session` ✅ thỏa đầy đủ Domain #7 (Mentor Interaction). Không có domain nào trong 2 domain này còn thiếu bảng sau Round 4.

**9. Is self_assessment_mismatch correctly placed?**
✅ Có — đặt làm Child trong Aggregate `discovery_session` (Boundary 8), write-owner Discovery Domain, đúng [LogicalDatabaseModel.md](LogicalDatabaseModel.md) ("input cho Recommendation/Assessment, không phải mastery itself" — DECISION-007). Không đặt nhầm dưới Assessment Domain (dù có FK tham chiếu `assessment_result`) — FK là tham chiếu chéo Domain, không đổi quyền sở hữu.

**10. Are history tables still required?**
✅ Có, không đổi — 4 bảng (`learner`, `knowledge_node`, `discovery_session`, `mentor_session`) theo DECISION-045, đã xác định đủ từ trước + qua Round 4. Vẫn **chưa viết SQL/trigger thực tế** (không nằm trong phạm vi bất kỳ Round Design nào tới giờ — task hiện tại cũng không yêu cầu SQL).

**11. Is Decision Header still required?**
✅ Có, không đổi — DECISION-048 vẫn cần 1 cơ chế tập trung cho D1/D6/D7/D9 reasoning. Round 4 **cố ý không thiết kế** theo chỉ định task. Vẫn là gap Critical (C-04) treo cho Round sau.

**12. Are D1 and D5 still unresolved?**
✅ Đúng, không đổi — GAP-01 (D1 Teaching 0% persistence) và GAP-02 (D5 Local Expansion no internal reason store) **vẫn hoàn toàn chưa giải quyết**, đúng theo yêu cầu rõ ràng "Do NOT solve GAP-01/GAP-02" của task này. Cả 2 vẫn Critical (C-02/C-03).

**13. Is schema structure stable?**
✅ Có — không phát hiện thay đổi cấu trúc nào cần thiết với 25 bảng đã thiết kế xuyên Round 1-4 (không có FK/Boundary nào của Round 1-3 bị sửa lại, chỉ patch 2 FK đã hoãn có chủ đích). 5 điểm mở mới ở Round 4 (Risk #2-#6, [DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md)) là **tinh chỉnh enum/CHECK**, không phải thay đổi cấu trúc bảng/Boundary.

**14. Is full SQL generation now possible?**
🟡 **Một phần** — SQL cho 25 bảng Core (Round 1-4) + 2 FK patch: ✅ có thể generate ngay sau khi xác nhận 5 điểm mở (mục Khuyến nghị, [DDL_ROUND4_ARCHITECTURE_REVIEW.md](DDL_ROUND4_ARCHITECTURE_REVIEW.md)). SQL cho **toàn bộ hệ thống** (bao gồm Decision Header, D1/D5 persistence, history trigger thực tế): ❌ chưa thể — 3 mảng này vẫn ngoài phạm vi mọi Round Design tới giờ.

**15. What remains before implementation?**
Xem mục 10 (Readiness Assessment) — tổng hợp đầy đủ theo 4 trục được yêu cầu.

---

## 10. DDL_ROUND4_READINESS_ASSESSMENT

| Trục | Đánh giá | Điều kiện còn thiếu |
|---|---|---|
| **Full SQL Generation** | 🟢 **Sẵn sàng cho 25 bảng Core (Round 1-4)** | Xác nhận 5 điểm mở ([DDL_ROUND4_ARCHITECTURE_REVIEW.md](DDL_ROUND4_ARCHITECTURE_REVIEW.md) mục Khuyến nghị) trước khi viết `CREATE TABLE` thật. **Không sẵn sàng** cho Decision Header/D1/D5/history trigger — 3 mảng đó chưa qua Design Round nào |
| **Policy Authoring (RLS)** | 🟢 **Sẵn sàng cho 5 bảng Round 4** | Cả 5 bảng khớp 2 pattern RLS đã validate (0-hop/1-hop theo `learner_id`) — không cần thiết kế Policy mới ngoài áp dụng lại template đã có ở [RLS_POLICY_STRATEGY.md](RLS_POLICY_STRATEGY.md)/[POLICY_AUTHORING_PREPARATION.md](POLICY_AUTHORING_PREPARATION.md). 🔶 Riêng `recommendation_proposal.traced_to[]` enforcement (C-05) có thể cần 1 Policy/Function bổ sung nếu Founder chọn enforce bằng trigger — chưa quyết |
| **Backend Implementation** | 🟡 **Một phần sẵn sàng** | Module Discovery/Mentor Interaction/Recommendation Engine có thể bắt đầu implement persistence layer cho 5 bảng Round 4 ngay. **Chưa sẵn sàng** cho: (a) bất kỳ tính năng phụ thuộc Decision Header/D1/D5, (b) Discovery Mismatch Detection Algorithm (logic, không phải DB — vẫn là Open Question PRD #5) |
| **Production Deployment** | 🔴 **Chưa sẵn sàng toàn hệ thống** | Schema Core (25 bảng) có thể deploy độc lập nếu chấp nhận "AI Explainability cho D1/D5/Decision Header sẽ ship sau" — nhưng theo DECISION-048 ("All AI Decisions Must Be Explainable"), **deploy production đầy đủ** đòi hỏi đóng C-02/C-03/C-04 trước, không chỉ C-01 (đã đóng ở Round 4) |

**Tổng kết:** Round 4 đưa schema Core Domain (Discovery/Mentor Interaction/Recommendation) từ "chưa tồn tại" lên "đầy đủ, sẵn sàng SQL hóa, sau khi xác nhận 5 điểm enum/CHECK còn mở". **Không có gap nào trong số phát hiện mới của Round 4 yêu cầu dừng lại thiết kế lại Round 1-3.** Khoảng cách lớn nhất còn lại trước Production Deployment đầy đủ là **Decision Header + D1/D5 persistence** — cố ý nằm ngoài phạm vi Round 4, là việc của Round kế tiếp ("Decision Header (future round)" / "D1/D5 explainability persistence (future round)" — đúng như đã định sẵn từ DDL Finalization Review).

## Liên kết ngược

[DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md), [DDL_ROUND4_ARCHITECTURE_REVIEW.md](DDL_ROUND4_ARCHITECTURE_REVIEW.md), [DDL_GAP_CONSOLIDATION.md](DDL_GAP_CONSOLIDATION.md), [DDL_FINALIZATION_READINESS.md](DDL_FINALIZATION_READINESS.md), [DDL_COVERAGE_REVIEW.md](DDL_COVERAGE_REVIEW.md), [LogicalDatabaseModel.md](LogicalDatabaseModel.md), [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md), [DECISION-027](../11_Decisions/DECISION-027-Explainability-First.md), [DECISION-031](../11_Decisions/DECISION-031-SubSession-vs-MentorSession.md), [DECISION-032](../11_Decisions/DECISION-032-Immutable-Goal.md), [DECISION-033](../11_Decisions/DECISION-033-Adaptive-Pause.md), [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md), [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md).

**Chưa có SQL/API/Frontend nào được tạo. Decision Header chưa thiết kế. GAP-01/GAP-02 (D1/D5) chưa giải quyết — đúng phạm vi được giao cho Round 4.**
