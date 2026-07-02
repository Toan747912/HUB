# Pre-Database Architecture Review — AI Mentor OS

> Trạng thái: Báo cáo tổng hợp cuối Domain Modeling Phase (không phải Decision Log, không tự mở khóa [DECISION-018](../11_Decisions/DECISION-018-Domain-Modeling-Phase.md)). Tổng hợp toàn bộ Round 1-6 (DECISION-001 đến DECISION-033). Không thiết kế bảng, không thiết kế API, không thiết kế UI — chỉ đánh giá mức độ sẵn sàng của Domain Architecture trước khi bước sang Database Design.

## A. Domain Review

### A.1 Domain Completeness

10 Core Domain đã có ranh giới, Aggregate Root, Domain Event, Ownership rõ ràng — xem [CoreDomainMap.md](CoreDomainMap.md) mục 1-5:

| # | Domain | Trạng thái hoàn thiện |
|---|---|---|
| 1 | Identity | Tối giản, không đổi từ Round 1 — đủ cho phạm vi hiện tại |
| 2 | Goal & Roadmap | Đầy đủ — Goal nay immutable (DECISION-032), Roadmap vẫn cây (không đổi từ Round 4) |
| 3 | Knowledge Graph | Đầy đủ — DAG (DECISION-025), cycle detection chốt (DECISION-029); chỉ còn danh sách `relation_type` đầy đủ là 🔶 (câu 18, không chặn schema cơ bản) |
| 4 | Evidence | Đầy đủ từ Round 3-4, không đổi ở Round 5-6 |
| 5 | Assessment | Đầy đủ — write-owner Mastery rõ (DECISION-026), nội dung `AssessmentResult` chốt 8 trường (DECISION-030); chỉ còn cardinality (câu 20) là 🔶 |
| 6 | Discovery | Tối giản, không đổi từ Round 1 |
| 7 | Mentor Interaction | Không đổi định nghĩa `MentorSession` — nay có thêm quan hệ rõ với `SubSession` (DECISION-031) |
| 8 | Recommendation | Đầy đủ — nay hỗ trợ thêm loại đề xuất "pause" (DECISION-033), không đổi cấu trúc gốc (DECISION-019/027) |
| 9 | Learning Profile (Projection) | Không có Aggregate ghi — không cần "hoàn thiện" thêm ở mức Domain |
| 10 | Learning Session | Đầy đủ — Aggregate Root, Lifecycle, State Model, hierarchy với SubSession/MentorSession đã chốt (DECISION-028/031/032/033) |

**Kết luận A.1:** Không có domain nào còn thiếu Aggregate Root, Ownership, hoặc Domain Event cốt lõi. Các điểm còn 🔶 (câu 18, 20, 21 kế thừa Round 4; câu 12-15 kế thừa Round 3) đều là **giá trị/danh sách/cardinality cụ thể**, không phải **thiếu cấu trúc** — phân biệt quan trọng để đánh giá đúng mức độ sẵn sàng ở mục D.

### A.2 Aggregate Roots (danh sách đầy đủ, hợp nhất Round 1-6)

| Aggregate Root | Domain | Thay đổi gần nhất |
|---|---|---|
| `Learner` | Identity | — |
| `Goal` | Goal & Roadmap | Immutable (DECISION-032, Round 6) |
| `Roadmap` (chứa `RoadmapNode`, `ApprovalRecord`) | Goal & Roadmap | — |
| `KnowledgeNode` (chứa `KnowledgeEdge` đi ra, `ExpansionRecord`) | Knowledge Graph | Cycle detection chốt (DECISION-029, Round 5) |
| `KnowledgeNodeMastery` | Assessment | — |
| `AssessmentResult` | Assessment | Nội dung 8 trường chốt (DECISION-030, Round 5) |
| `Evidence` (chứa `EvidenceLink[]`) | Evidence | — |
| `DiscoverySession` (chứa `SelfAssessmentMismatch`) | Discovery | — |
| `MentorSession` | Mentor Interaction | Nay có quan hệ rõ với `SubSession` (DECISION-031, Round 6) |
| `RecommendationProposal` | Recommendation | Hỗ trợ thêm action type "pause" (DECISION-033, Round 6) |
| `LearningSession` (chứa `SubSession[]`) | Learning Session | Mới (DECISION-028, Round 5); hierarchy hoàn thiện (DECISION-031, Round 6) |

Không có Aggregate Root nào còn ở trạng thái "chưa xác định" hoặc "tranh chấp write-owner".

### A.3 Boundaries

Không phát hiện Ownership Conflict mới qua Round 5-6 — xác nhận lại tại [CoreDomainMap.md](CoreDomainMap.md) mục 2 và 5: Learning Session chỉ đọc 5 domain khác, Goal immutable không tạo nhu cầu ghi chồng lên Roadmap/Knowledge, Recommendation đề xuất pause không trao quyền ghi `LearningSession` cho Recommendation Domain (Learning Session vẫn là write-owner duy nhất của chính nó, chỉ *lắng nghe* xác nhận của Learner).

**Kết luận A.3:** Boundary giữa 10 domain nhất quán, không có domain nào ghi vào Aggregate Root của domain khác.

## B. Runtime Review

> Chi tiết đầy đủ: [RuntimeLearningFlow.md](RuntimeLearningFlow.md).

### B.1 Runtime Flow

Luồng runtime đã có đường dẫn rõ từ Discovery → Goal & Roadmap → Learning Session (Started) → SubSession → MentorSession → Evidence → Assessment → (Knowledge Expansion / Recommendation) → Learning Session (Completed/Paused/Archived). Không có nhánh nào thiếu domain xử lý — mọi bước đều rơi vào đúng 1 domain đã có Ownership rõ.

**Điểm rủi ro runtime duy nhất đã xác định (không phải blocker cấu trúc):** trạng thái `Paused` của `LearningSession` là **derived** (suy ra), không phải lúc nào cũng có 1 hành động ghi rõ ràng (trừ khi Learner tự bấm hoặc xác nhận đề xuất) — Application Layer cần quyết định tính `Paused` tại thời điểm đọc hay duy trì bằng job định kỳ. Đây là quyết định Application Architecture, đã ghi chú ở [ROUND5_ARCHITECTURE_REVIEW.md](ROUND5_ARCHITECTURE_REVIEW.md) mục 2, không chặn Domain/Database Design.

### B.2 Event Flow

Chuỗi Domain Event đã khép kín cho cả 2 nhánh chính:
- **Nhánh học tập bình thường:** `EvidenceRecorded` → `AssessmentResultCreated` → `MasteryLevelAchieved`/`TeachScoreUpdated`/`KnowledgeRegressionDetected` → `RecommendationProposed` (tùy chọn) → Learner xác nhận.
- **Nhánh thay đổi vòng đời:** `LearningSessionStarted`/`Paused`/`Resumed`/`Completed`/`Archived`, `SubSessionStarted`/`Ended` — đều có nguồn phát rõ (Learner action hoặc Domain Event từ domain khác), không có event "mồ côi" (không nguồn phát).

Không phát hiện circular event dependency (domain A chờ event domain B, B lại chờ event A).

### B.3 State Flow

State Model của `LearningSession`/`SubSession` (đã cập nhật Round 6, [LearningSessionDomain.md](LearningSessionDomain.md)) là hữu hạn, có trạng thái terminal rõ (`Completed`/`Archived`), không có transition mơ hồ. `Goal` không còn state machine nội bộ (immutable — chỉ "tồn tại" hoặc "bị thay thế bởi Goal mới", không có transition trung gian).

**Kết luận B:** Runtime Flow/Event Flow/State Flow đã đủ rõ để mô tả được toàn bộ vòng đời 1 Learner×Goal mà không cần giả định ngầm nào chưa ghi nhận.

## C. Explainability Review

### C.1 Evidence Traceability

Chuỗi truy vết: `AssessmentResult.Evidence References` → `Evidence`/`EvidenceLink` cụ thể → `MentorSession`/`SubSession` nơi Evidence đó sinh ra (qua quan hệ mới chốt ở DECISION-031) → `LearningSession` (Learner×Goal nào). Với cấu trúc 8 trường của `AssessmentResult` (DECISION-030), mọi thay đổi `KnowledgeNodeMastery` đều có thể truy ngược tới đúng 1 lượt tương tác cụ thể, không chỉ tới "1 Evidence nói chung". Đây là cải thiện trực tiếp so với Round 4 (khi `verdict` còn là Pass/Fail đơn).

**Gap còn lại:** cardinality `AssessmentResult` (per-Evidence hay per-EvidenceLink, câu 20) vẫn ảnh hưởng độ chi tiết truy vết theo từng KnowledgeNode khi 1 Evidence chứng minh nhiều node cùng lúc — không phải lỗ hổng (vẫn truy vết được ở mức Evidence), chỉ là chưa tối ưu độ chi tiết.

### C.2 Recommendation Traceability

`RecommendationProposal.traced_to[]` (bắt buộc từ DECISION-027) trỏ tới `Evidence`/`AssessmentResult`/`DiscoverySession` cụ thể đã sinh ra tín hiệu. Với DECISION-033 (Round 6), đề xuất "pause" cũng đi qua cùng cơ chế `RecommendationProposed` + `traced_to[]` — **không có loại đề xuất nào (kể cả pause) được miễn trừ khỏi Explainability First**. Learner luôn có thể hỏi "vì sao AI đề xuất pause/đổi roadmap này" và nhận được tham chiếu cụ thể, không phải lý do chung.

**Kết luận C:** Không có "quyết định hộp đen" nào sót lại trong toàn bộ luồng đã rà soát qua Round 1-6. Explainability First (DECISION-027) được áp dụng nhất quán, bao gồm cả Domain mới (Learning Session) và quyết định mới (Adaptive Pause).

## D. Database Readiness Assessment

### Kết luận: ✅ READY (cho phạm vi đã ổn định — xem danh sách dưới)

**Lý do:** Blocker cứng duy nhất từng được xác định ([ROUND4_DOMAIN_REVIEW.md](ROUND4_DOMAIN_REVIEW.md) mục 6 — câu 19, cơ chế cycle detection) đã đóng ở Round 5 (DECISION-029). 3 Open Question phát sinh ở Round 5 (câu 22-24, liên quan trực tiếp tới schema `learning_sessions`/`sub_sessions`) đã đóng toàn bộ ở Round 6 (DECISION-031/032/033). Không có Open Question nào còn lại được phân loại "chặn DDL" — toàn bộ câu hỏi còn mở (18, 20, 21, và các câu Round 1/3 chưa trả lời) chỉ ảnh hưởng **giá trị cột, enum, hoặc cardinality**, không ảnh hưởng **việc bảng có tồn tại hay không**.

### Giả định cần giữ nguyên khi sang Database Design

Vì kết luận là READY, các giả định sau **phải giữ nguyên** trong Database Design — nếu Database Design cần đổi giả định nào, đó là "yêu cầu mở khóa" Domain Architecture, không phải chi tiết hóa thông thường:

1. **`Goal` là immutable** — không có statement `UPDATE goals SET ...` nào trên các trường định nghĩa mục tiêu; mọi "thay đổi Goal" là INSERT row mới + cập nhật `learning_sessions.state` của session cũ sang `archived`.
2. **`Evidence`, `AssessmentResult`, `KnowledgeEdge`, `RecommendationProposal` là immutable log** — chỉ INSERT, không UPDATE/DELETE (đã chốt từ Round 3-4, không đổi).
3. **`knowledge_edges` không cần bảng closure phụ** — cycle detection thực hiện ở Application Layer bằng runtime traversal tại thời điểm ghi cạnh (DECISION-029); schema không cần cột/bảng hỗ trợ closure.
4. **`assessment_results` có đúng 8 cột nội dung cố định** (KnowledgeNode reference, Remember, Explain, Apply, Teach, Confidence, Evidence References, Reasoning) — không rút gọn về 1 cột `verdict`.
5. **`learning_sessions`/`sub_sessions`/`mentor_sessions` là 3 bảng riêng** theo hierarchy đã chốt (DECISION-031) — không gộp `sub_sessions` vào `mentor_sessions` bằng 1 cột nhãn.
6. **Mọi bảng ghi Mastery/Recommendation/Expansion có cột tham chiếu nguồn bắt buộc** (`source_evidence_id`/`source_assessment_result_id`/`source_discovery_session_id` hoặc tương đương) — không nullable, theo Explainability First (DECISION-027).
7. **`LearningSession.state` có ít nhất 5 giá trị**: `active`, `paused`, `completed`, `archived` (và `resumed` được mô hình là quay lại `active`, không phải giá trị state riêng).
8. **Không có cơ chế tự động (cron/trigger) đổi `LearningSession.state` sang `paused` dựa trên thời gian** — mọi chuyển sang `paused` đi qua hành động Learner (trực tiếp hoặc xác nhận đề xuất), theo DECISION-033.

### Các điểm không chặn DDL nhưng nên trả lời trước khi viết Application/Query logic chi tiết

(Kế thừa, không đổi nhiều so với [ROUND4_DOMAIN_REVIEW.md](ROUND4_DOMAIN_REVIEW.md) mục 6 và [ROUND5_ARCHITECTURE_REVIEW.md](ROUND5_ARCHITECTURE_REVIEW.md) mục 6 — liệt kê lại để có 1 nguồn tổng hợp duy nhất tại thời điểm Pre-Database Review):

- Câu 18 — danh sách `relation_type` đầy đủ cho `KnowledgeEdge`.
- Câu 20 — `AssessmentResult` cardinality (per-Evidence hay per-EvidenceLink).
- Câu 21 — entity ghi log nội bộ cho Local Expansion (event store có đủ, hay cần bảng riêng).
- Câu 12-15 (Round 3) — `capability_weight`, `evidence_weight`, field `type` cấp Evidence, tiêu chí Controlled Expansion cụ thể.

Không câu nào trong nhóm này ảnh hưởng tới việc bảng cơ bản (mục giả định 1-8 trên) có thể được tạo ngay.

## Liên kết ngược

[CoreDomainMap.md](CoreDomainMap.md), [LearningSessionDomain.md](LearningSessionDomain.md), [AssessmentDomain.md](AssessmentDomain.md), [RuntimeLearningFlow.md](RuntimeLearningFlow.md), [ROUND4_DOMAIN_REVIEW.md](ROUND4_DOMAIN_REVIEW.md), [ROUND5_ARCHITECTURE_REVIEW.md](ROUND5_ARCHITECTURE_REVIEW.md), [Docs/01_PRD/OpenQuestions.md](../01_PRD/OpenQuestions.md), [Docs/10_Backlog/Backlog.md](../10_Backlog/Backlog.md), [Docs/Project_Index.md](../Project_Index.md).

**Quyết định mở khóa Database Design (DECISION-018) vẫn cần Founder xác nhận rõ — kết luận READY ở trên là đánh giá kỹ thuật của Claude, không phải tự động mở khóa giai đoạn dự án.**
