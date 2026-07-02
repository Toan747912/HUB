# Application Orchestration Design — End-to-End Flows

> Phạm vi: thiết kế **hành vi** (behavior), không SQL/API/UI, không tạo entity mới, không chốt quyết định. Dựa trên Service Catalog ([APPLICATION_SERVICES_ARCHITECTURE.md](APPLICATION_SERVICES_ARCHITECTURE.md)) và Boundary Matrix ([APPLICATION_SERVICE_BOUNDARY_MATRIX.md](APPLICATION_SERVICE_BOUNDARY_MATRIX.md)) của Round trước. 5 flow dưới đây mô tả **chuỗi hành vi đầu-cuối**, không phải danh sách Service rời rạc.

---

## Flow 1 — Assessment Flow

**Phạm vi:** Learner hoàn thành 1 assessment → tới khi Recommendation khả dụng.

| # | Mục | Nội dung |
|---|---|---|
| 1 | Trigger | Learner gửi phản hồi/câu trả lời trong 1 `MentorSession` đang active |
| 2 | Initiating Service | `MentorInteractionService` |
| 3 | Service Sequence | `MentorInteractionService` → (event) → `AssessmentService` → (event) → `RecommendationService` |
| 4 | Aggregates Modified | `Evidence`/`EvidenceLink` (MentorInteraction) → `AssessmentResult`/`KnowledgeNodeMastery` (Assessment) → `TraceLink` (×2, qua ExplainabilityService) → `RecommendationProposal` (Recommendation) |
| 5 | Transaction Boundaries | **TB1:** `Evidence`+`EvidenceLink` (MentorInteractionService). **TB2:** `AssessmentResult`+`KnowledgeNodeMastery`+`TraceLink`→Evidence (AssessmentService+ExplainabilityService). **TB3:** `RecommendationProposal`+`TraceLink`→AssessmentResult (RecommendationService+ExplainabilityService). 3 transaction tách biệt, nối bằng event (async hop), không phải 1 transaction lớn xuyên suốt |
| 6 | Events Produced | `EvidenceRecorded` → `AssessmentResultCreated` (+ `KnowledgeRegressionDetected` nếu có) → `RecommendationProposed` |
| 7 | Events Consumed | `AssessmentService` consume `EvidenceRecorded`; `RecommendationService` consume `AssessmentResultCreated`/`KnowledgeRegressionDetected` |
| 8 | Explainability Generation Point | 2 điểm: (a) ngay khi `AssessmentResult` được tạo (TraceLink → Evidence/EvidenceLink); (b) ngay khi `RecommendationProposal` được tạo (TraceLink → AssessmentResult/signal) |
| 9 | Decision Persistence Point | D2 (Assessment) đã có Detail (`AssessmentResult`) — Header registration **tuỳ chọn** (Round 4.3 Migration Impact). D3 (Recommendation) — Header registration **bắt buộc khi Shared Mechanism được chọn**, cùng transaction với TB3 |
| 10 | Failure Scenarios | (a) `AssessmentService` down khi `EvidenceRecorded` phát ra — Evidence vẫn an toàn (immutable), chỉ trễ; (b) `TraceLink` write lỗi trong TB2/TB3 — rollback toàn bộ, không có bản ghi mồ côi; (c) 2 `EvidenceRecorded` gần đồng thời cho cùng `KnowledgeNode` → conflict ghi `KnowledgeNodeMastery` (version_number, DECISION-044) |
| 11 | Retry Strategy | Event consumer dùng at-least-once + idempotent processing (dedupe theo event id) — an toàn để retry toàn bộ TB2/TB3 sau crash. Conflict ghi Mastery: retry vòng lặp optimistic-concurrency tại `AssessmentService`, không phải retry toàn bộ event |
| 12 | Consistency Requirements | Strong trong từng TB; Eventual giữa các TB (qua event) |
| 13 | Atomic Operations | TB1, TB2, TB3 (nội bộ từng cái) |
| 14 | Eventually Consistent Operations | Evidence→Assessment hop, Assessment→Recommendation hop |

---

## Flow 2 — Teaching Flow

**Phạm vi:** Learner bắt đầu 1 hoạt động học → tới khi AI chọn và trình bày nội dung.

| # | Mục | Nội dung |
|---|---|---|
| 1 | Trigger | Learner bắt đầu/tiếp tục `SubSession`, hoặc cần nội dung kế tiếp trong `SubSession` đang active |
| 2 | Initiating Service | `LearningSessionOrchestrationService` (khởi tạo `SubSession`), bàn giao cho `TeachingService` |
| 3 | Service Sequence | `LearningSessionOrchestrationService` → (event) → `TeachingService` (đọc 4 domain) → `MentorInteractionService` (trình bày) |
| 4 | Aggregates Modified | `SubSession` (Learning Session). **Không có gì khác** — Content Selection (D1) không ghi vào Aggregate nghiệp vụ nào (Round 3.9) |
| 5 | Transaction Boundaries | **TB1:** `SubSession` start (tự thân, đơn giản). **TB2 (hiện không tồn tại):** Content Selection không ghi gì — đây chính là GAP-01 thể hiện ở mức flow. **(Tương lai) TB2':** lựa chọn nội dung + Decision Header — atomic, chưa được nối dây vì cơ chế chưa chọn |
| 6 | Events Produced | `SubSessionStarted`. **(Tương lai)** `DecisionRegistered(D1)` |
| 7 | Events Consumed | `TeachingService` consume `SubSessionStarted` |
| 8 | Explainability Generation Point | **Không có điểm nào hiện tại** — đây là GAP-01 tái xác nhận ở mức hành vi cụ thể: điểm *nên* sinh ra (ngay sau khi `TeachingService` chọn nội dung, trước khi trình bày) không có gì ghi vào |
| 9 | Decision Persistence Point | Cùng vị trí với mục 8 — hiện là no-op |
| 10 | Failure Scenarios | (a) `TeachingService` đọc Mastery/Roadmap/Recommendation stale (do Eventual Consistency từ Flow 1) — chọn nội dung dựa trên info hơi cũ, hậu quả thấp, tự sửa ở lượt sau; (b) `TeachingService` crash giữa lúc chọn — không có gì bị mất vì chưa ghi gì, an toàn để retry toàn bộ bước; (c) **(Tương lai, chưa giải quyết)** nếu Decision Header write thất bại *sau khi* nội dung đã trình bày cho Learner — có nên block trải nghiệm dạy-học để đảm bảo ghi log, hay log là best-effort? Đây là 1 mâu thuẫn thiết kế thật giữa nguyên tắc "luôn atomic với Detail" (áp dụng cho Flow 1/3/4) và nhu cầu "không chặn trải nghiệm chính vì lỗi logging" — **chưa được giải quyết ở Round này** |
| 11 | Retry Strategy | Bước chọn nội dung tự nhiên idempotent (đọc + chọn, không side-effect) cho tới khi có bước ghi. Khi Decision Header được thêm, cần 1 quyết định rõ: accept-eventual-loss (best-effort, không retry) hay retry-until-success (chặn) — **chưa chốt**, mâu thuẫn nêu ở mục 10(c) |
| 12 | Consistency Requirements | Eventual cho mọi dữ liệu đọc; Strong chỉ cho `SubSession` tự thân |
| 13 | Atomic Operations | `SubSession` start/transition |
| 14 | Eventually Consistent Operations | Mọi dữ liệu `TeachingService` đọc để chọn nội dung (Mastery, Roadmap dependency, Recommendation) |

---

## Flow 3 — Knowledge Expansion Flow

**Phạm vi:** AI phát hiện 1 lỗ hổng kiến thức → tới khi Knowledge Graph mở rộng hoàn tất.

| # | Mục | Nội dung |
|---|---|---|
| 1 | Trigger | Tín hiệu "gap" — từ `TeachingService` (RoadmapNode cần độ sâu KnowledgeNode chưa có) hoặc `RoadmapMappingService`/`DiscoveryService` |
| 2 | Initiating Service | `KnowledgeExpansionService` (nhận tín hiệu gap) |
| 3 | Service Sequence | (Nguồn gap) → `KnowledgeExpansionService` → (event) → `RoadmapMappingService` / `MentorInteractionService` |
| 4 | Aggregates Modified | `KnowledgeEdge` (mới), `ExpansionRecord` (chỉ Deep/Structural), `TraceLink` (tuỳ chọn, Deep/Structural) |
| 5 | Transaction Boundaries | **Deep/Structural:** `KnowledgeEdge`(s) + `ExpansionRecord` (+ `TraceLink` nếu dùng) — atomic. **Local:** `KnowledgeEdge` + (khi GAP-02 đóng) log lý do nội bộ — atomic; **hiện tại chỉ có `KnowledgeEdge` đơn lẻ, không có gì để atomic cùng** — đây chính là GAP-02 ở mức hành vi |
| 6 | Events Produced | `KnowledgeNodeExpanded` (biến thể Local/Deep-Structural) |
| 7 | Events Consumed | Tín hiệu gap — **không có tên event chính thức nào trong Domain Events List ([CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 4) cho "phát hiện gap"** — phát hiện mới của Round này, xem [APPLICATION_ORCHESTRATION_REVIEW.md](APPLICATION_ORCHESTRATION_REVIEW.md) mục Cross-Flow |
| 8 | Explainability Generation Point | Deep/Structural: ngay khi `ExpansionRecord` được tạo (`expansion_reason`, hiển thị Learner). Local: **nên** sinh ngay khi `KnowledgeEdge` được tạo — chưa có nơi ghi (GAP-02) |
| 9 | Decision Persistence Point | D4 (Deep/Structural) đã thoả qua Detail — Header tuỳ chọn. D5 (Local) — Header **bắt buộc theo DECISION-027/048** nhưng chưa có cơ chế |
| 10 | Failure Scenarios | (a) Transaction Deep/Structural fail giữa chừng khi tạo nhiều Edge — atomic rollback ngăn "Edge mồ côi", nhưng cardinality Edge↔Record cụ thể vẫn chưa chốt (GAP-03) dù transaction an toàn; (b) Local Expansion "thành công" nhưng không có lý do nào truy vết được — không phải lỗi runtime, là 1 silent explainability gap luôn xảy ra; (c) 2 nguồn gap (vd: Teaching và Discovery) trigger Expansion cho cùng `KnowledgeNode` gần đồng thời — không có cơ chế dedupe, rủi ro tạo Edge trùng lặp |
| 11 | Retry Strategy | Khuyến nghị 1 idempotency key ở tầng tín hiệu gap (trước khi vào `KnowledgeExpansionService`) để tránh Expansion trùng lặp từ nhiều nguồn — **chưa thiết kế cụ thể**, chỉ flag |
| 12 | Consistency Requirements | Strong cho chính Knowledge Graph (dữ liệu dùng chung, không scope theo Learner); Eventual cho consumer downstream (`RoadmapMappingService`, `MentorInteractionService`) |
| 13 | Atomic Operations | `KnowledgeEdge`+`ExpansionRecord`(+`TraceLink`) cho Deep/Structural |
| 14 | Eventually Consistent Operations | `RoadmapMappingService`/`MentorInteractionService` phản ứng với `KnowledgeNodeExpanded` |

---

## Flow 4 — Recommendation Flow

**Phạm vi:** 1 tín hiệu học tập/vấn đề xuất hiện → tới khi `RecommendationProposal` được tạo ra.

| # | Mục | Nội dung |
|---|---|---|
| 1 | Trigger | 1 trong 4 loại tín hiệu: `KnowledgeRegressionDetected` (Assessment), `SelfAssessmentMismatchDetected` (Discovery), dependency-gap (truy vấn Roadmap+Knowledge, không phải event), pause-eligible (Learning Session/Stuck Detection D9a — chưa tồn tại) |
| 2 | Initiating Service | `RecommendationService` (consumer/synthesizer, bất kể tín hiệu nào tới trước) |
| 3 | Service Sequence | (1..4 signal source) → `RecommendationService` → (event) → `LearningSessionOrchestrationService` (loại pause) / `TeachingService` (loại review concept) |
| 4 | Aggregates Modified | `RecommendationProposal`, `TraceLink` |
| 5 | Transaction Boundaries | `RecommendationProposal` + `TraceLink` (`traced_to[]`) — atomic, **không ngoại lệ, kể cả loại pause** (DECISION-027/033) |
| 6 | Events Produced | `RecommendationProposed` (đa subtype) |
| 7 | Events Consumed | `KnowledgeRegressionDetected`, `SelfAssessmentMismatchDetected`. **dependency-gap và pause-eligible không có event tên chính thức** — cả 2 là truy vấn/poll, không phải event-driven — phát hiện mới, xem Cross-Flow Analysis |
| 8 | Explainability Generation Point | Tại thời điểm synthesize proposal, qua `ExplainabilityService` — bắt buộc, không ngoại lệ |
| 9 | Decision Persistence Point | D3 — cùng điểm với mục 8, pending Shared Mechanism |
| 10 | Failure Scenarios | (a) Tín hiệu chỉ có 1 phần (GAP-06 — mismatch thường thiếu) — `RecommendationService` phải định nghĩa hành vi "tổng hợp với <4 signal", **chưa được đặc tả** ở Round này; (b) 2 tín hiệu khác nguồn cùng nói về 1 `KnowledgeNode` tới gần như đồng thời — rủi ro proposal trùng/mâu thuẫn nếu không có cơ chế dedupe/aggregation window; (c) `TraceLink` write lỗi — rollback toàn bộ, không proposal nào thiếu `traced_to[]` |
| 11 | Retry Strategy | Idempotent consumption theo event id cho từng tín hiệu; khuyến nghị 1 debounce/aggregation window ngắn trước khi synthesize (chờ thu thập tín hiệu gần đồng thời về cùng 1 node) — **chưa thiết kế chi tiết**, chỉ là hướng hợp lý |
| 12 | Consistency Requirements | Strong cho proposal+trace write; Eventual cho việc consume tín hiệu đầu vào |
| 13 | Atomic Operations | `RecommendationProposal`+`TraceLink` |
| 14 | Eventually Consistent Operations | Việc nhận/consume các signal event; truy vấn dependency-gap/pause-eligible |

---

## Flow 5 — Mentor Interaction Flow

**Phạm vi:** AI đổi hành vi/Mode mentoring → tới khi Learner nhận được hướng dẫn.

| # | Mục | Nội dung |
|---|---|---|
| 1 | Trigger | Tín hiệu tương tác trong `MentorSession`/`SubSession` đang active gợi ý nên đổi Learning Mode hoặc cần can thiệp Stuck — **nguồn tín hiệu cụ thể chưa chốt** (Round 4.2 Remaining Risk #1) |
| 2 | Initiating Service | `MentorInteractionService` |
| 3 | Service Sequence | `MentorInteractionService` (quan sát tín hiệu → quyết Mode) → (event) → trình bày cho Learner. **(Giả định, chưa tồn tại)** nhánh Stuck: `MentorInteractionService` (D9a) → `TeachingService` (D9b) |
| 4 | Aggregates Modified | `MentorSession` (cột `mode`) |
| 5 | Transaction Boundaries | `MentorSession.mode` update — atomic, đơn-row, **không cần companion write nào hôm nay** (D8 dùng Runtime Reconstruction, không cần `TraceLink`). **(Tương lai)** nếu thêm Decision Header, nên cùng transaction với mode update — nhưng vì D8 không có Detail, "atomic với Detail" (quy tắc áp dụng cho Flow 1/3/4) **không áp dụng được** ở đây — cần 1 ngoại lệ tường minh, không nên xử lý ngầm như các trường hợp khác |
| 6 | Events Produced | `MentorSessionModeChanged` |
| 7 | Events Consumed | **Không có event chính thức nào trigger flow này** — input signal source chưa chốt, giống vấn đề đã thấy ở Flow 3 |
| 8 | Explainability Generation Point | **Khác biệt hẳn 4 flow khác:** không có điểm ghi tại thời điểm flow chạy — explainability của D8 chỉ tồn tại dưới dạng **Runtime Reconstruction tại thời điểm truy vấn sau này** (Round 4.1-4.2), không phải write-time như các flow khác |
| 9 | Decision Persistence Point | (Tương lai, tuỳ chọn) đăng ký D8 vào Decision Header — không có Detail để neo transaction, chỉ atomic với chính `MentorSession.mode` write |
| 10 | Failure Scenarios | (a) Mode đổi nhưng bước trình bày cho Learner (delivery) lỗi — Learner thấy hành vi Mode cũ trong khi backend đã ghi Mode mới, cần re-fetch trước khi render (UI concern, ngoài phạm vi); (b) **Runtime Reconstruction thất bại vì input tại bước 1 chưa từng được persist ở đâu** (điều kiện chưa xác minh, Round 4.1-4.3) — đây là **silent failure**: không crash, không lỗi hiển thị, chỉ là câu hỏi "vì sao" sau này không có câu trả lời — khác hẳn mọi failure scenario khác trong 5 flow (tất cả đều có dấu hiệu lỗi rõ ràng) |
| 11 | Retry Strategy | Mode write tự thân: idempotent, retry trivial. **Failure (b) ở mục 10 không có Retry Strategy nào khả thi** — nếu input chưa từng được lưu, không số lần retry nào phục hồi được nó. Đây là phát hiện quan trọng nhất của flow này |
| 12 | Consistency Requirements | Strong cho `MentorSession.mode` write; N/A cho explainability (query-time, không phải write-time) |
| 13 | Atomic Operations | `MentorSession.mode` update (đơn lẻ) |
| 14 | Eventually Consistent Operations | Việc trình bày hướng dẫn cho Learner (presentation, có thể trễ ở mức UI, ngoài phạm vi) |

## Liên kết ngược

[APPLICATION_FLOW_SEQUENCE_MATRIX.md](APPLICATION_FLOW_SEQUENCE_MATRIX.md), [APPLICATION_ORCHESTRATION_REVIEW.md](APPLICATION_ORCHESTRATION_REVIEW.md), [APPLICATION_SERVICES_ARCHITECTURE.md](APPLICATION_SERVICES_ARCHITECTURE.md), [APPLICATION_SERVICE_BOUNDARY_MATRIX.md](APPLICATION_SERVICE_BOUNDARY_MATRIX.md).
