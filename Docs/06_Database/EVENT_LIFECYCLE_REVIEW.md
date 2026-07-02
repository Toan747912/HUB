# Event Lifecycle Review — AI Mentor OS

> Phạm vi: phân tích kiến trúc. Không SQL/API/UI, không entity mới, không chốt quyết định. Phân tích 10 khía cạnh lifecycle, Task 4 (4 trigger nghi vấn), Task 5 (cross-check DECISION-027/038/048), trả lời 10 Mandatory Questions, và Final Section (Readiness Assessment).

---

## 1. Event Creation

Mọi Domain Event (mục 1, [EVENT_CATALOG.md](EVENT_CATALOG.md)) được tạo **ngay sau khi** Aggregate tương ứng được ghi thành công trong transaction của Service sở hữu (vd: `AssessmentResultCreated` chỉ phát ra sau khi `AssessmentResult`+`KnowledgeNodeMastery`+`TraceLink` đã commit, theo TB2 ở [APPLICATION_ORCHESTRATION_DESIGN.md](APPLICATION_ORCHESTRATION_DESIGN.md) Flow 1). **Nguyên tắc chung:** Event creation luôn xảy ra **sau** write, không bao giờ **trước** hoặc **thay thế** write — Event không phải nguồn sự thật (mục 1 Catalog đã xác nhận "Không cần persist riêng" cho mọi Domain Event, vì Aggregate đã là nguồn sự thật).

---

## 2. Event Propagation

Toàn bộ Event hiện tại được mô tả là **Async** (mục 1, [EVENT_DEPENDENCY_MATRIX.md](EVENT_DEPENDENCY_MATRIX.md)) — propagation qua message broker/queue (cơ chế cụ thể ngoài phạm vi Database/Domain Architecture). **2 ngoại lệ quan trọng** không propagate qua cơ chế Event: lệnh gọi `ExplainabilityService`/`DecisionPersistenceService` — đây **không phải Event propagation**, là **function call/RPC trong cùng transaction** (đã chốt ở Round Application Services). Nhầm lẫn 2 cơ chế này (event vs direct call) là rủi ro lớn nhất đã được flag xuyên suốt — propagation model phải phân biệt rõ "thông báo cho ai khác biết" (event, async, eventual) vs "ghi cùng 1 sự thật nguyên tử" (direct call, sync, atomic).

---

## 3. Event Consumption

Mọi Consumer (AssessmentService, RecommendationService, DiscoveryService, KnowledgeExpansionService, MentorInteractionService, TeachingService, LearningSessionOrchestrationService, RoadmapMappingService) tiêu thụ Event theo mô hình **at-least-once delivery** (giả định mặc định, chưa có Decision nào chốt khác) — hệ quả trực tiếp: **mọi Consumer phải tự đảm bảo idempotent** (mục 7). Không có Consumer nào trong vocabulary hiện tại được phép giả định "exactly-once" — giả định sai sẽ dẫn tới double-write (vd: 2 `AssessmentResult` cho 1 `EvidenceRecorded` bị redeliver).

---

## 4. Event Failure Handling

| Loại lỗi | Xử lý |
|---|---|
| Consumer crash giữa lúc xử lý | Event được redeliver (at-least-once) — an toàn nếu Consumer idempotent |
| Consumer xử lý nhưng Service nội bộ lỗi (vd: AssessmentService nhận `EvidenceRecorded` nhưng `TraceLink` write lỗi) | Toàn bộ transaction nội bộ rollback (TB2) — Event vẫn coi là "chưa xử lý thành công", sẽ được retry theo cơ chế Consumer, không phải lỗi Event Architecture |
| Event không thể xử lý sau N lần retry | Dead-letter (`DeadLetterQueued`, System Event minh hoạ) — cần can thiệp thủ công, ngoài phạm vi Database/Domain Architecture |

**Không có Event nào trong vocabulary hiện tại được thiết kế "fail silently"** — mọi thất bại đều có tín hiệu nào đó (rollback, redelivery, dead-letter) **trừ 1 trường hợp đã biết từ Round Orchestration:** D8 (Mode Selection) — nếu input chưa từng persist, không phải lỗi Event Architecture (vì D8 không có event chính thức nào — mục Task 4), mà là lỗi ở tầng logic nghiệp vụ, silent theo đúng bản chất đã phân tích trước.

---

## 5. Event Replay Requirements

**Không có Event nào trong vocabulary cần Replay** (theo nghĩa Event Sourcing — dựng lại state bằng cách phát lại toàn bộ lịch sử event) — nhất quán hoàn toàn với [DECISION-035](../11_Decisions/DECISION-035-No-Full-Event-Sourcing.md) (No Full Event Sourcing). Mọi Aggregate đều có "current state" ghi trực tiếp (Snapshot) hoặc lịch sử đầy đủ ở Aggregate tự thân (Append-only) — Event chỉ là thông báo, không phải nguồn duy nhất để dựng lại bất cứ gì. **Hệ quả cho Retention (mục 8):** vì không cần Replay, Event không cần giữ vĩnh viễn — khác hẳn `Evidence`/`AssessmentResult` (phải giữ vĩnh viễn vì là nguồn sự thật).

---

## 6. Event Ordering Requirements

| Event nhóm | Cần Ordering? | Vì sao |
|---|---|---|
| `LearningSessionStarted`/`Paused`/`Resumed`/`Completed`/`Archived` (cùng 1 `LearningSession`) | **CÓ, bắt buộc** | Đây là state machine — xử lý "Completed" trước "Started" (do mất thứ tự) sẽ phá vỡ tính hợp lệ của vòng đời |
| `KnowledgeNodeExpanded` (cùng 1 `KnowledgeNode`, nhiều lần) | **CÓ, khuyến nghị** | Ảnh hưởng tới việc xác định cạnh nào mới nhất khi truy vết — liên quan trực tiếp GAP-03 (cardinality `ExpansionRecord`↔`KnowledgeEdge` chưa chốt, nhưng ordering vẫn cần dù cardinality thế nào) |
| `AssessmentResultCreated` (cùng 1 `KnowledgeNode`×Learner) | **CÓ, khuyến nghị** | Mastery là current-state — xử lý 2 `AssessmentResult` sai thứ tự có thể làm `KnowledgeNodeMastery` phản ánh sai giá trị "mới nhất" (dù `version_number`, DECISION-044, giúp phát hiện conflict, không tự sửa thứ tự sai) |
| Mọi Event khác (không cùng Aggregate, không có state machine) | Không cần ordering toàn cục | Chỉ cần ordering **per-aggregate** (per-partition-key trong message broker, nếu dùng) — không cần ordering xuyên toàn hệ thống |

**Nguyên tắc chung:** ordering chỉ cần đảm bảo **trong phạm vi 1 Aggregate** (per-key ordering), không cần global ordering — đây là yêu cầu phổ biến của hầu hết message broker hiện đại (partition theo aggregate id), không phải yêu cầu đặc biệt của hệ thống này.

---

## 7. Event Idempotency Requirements

**Tất cả Consumer phải idempotent — không có ngoại lệ**, vì mục 3 đã xác nhận mô hình at-least-once. Cơ chế đề xuất chung (không thiết kế chi tiết, chỉ nguyên tắc): mỗi Consumer dedupe theo `event_id` trước khi xử lý, hoặc đảm bảo write nghiệp vụ tự nhiên idempotent (vd: ghi `AssessmentResult` với `idempotency_key` = `evidence_id` nếu 1 Evidence chỉ nên sinh đúng 1 AssessmentResult — **đây là 1 quyết định nghiệp vụ cần Founder xác nhận, không tự giả định ở Round này**).

---

## 8. Event Retention Requirements

Theo kết luận mục 5 (No Replay), **Event không cần retention dài hạn** — khác hẳn `Evidence`/`AssessmentResult`/`RecommendationProposal` (retention vĩnh viễn, đã chốt ở [PersistenceArchitecture.md](PersistenceArchitecture.md)). Retention Event chỉ cần đủ lâu để hỗ trợ retry/dead-letter (vd: vài ngày), không cần đủ lâu để hỗ trợ audit lịch sử — **audit lịch sử nằm ở Aggregate (nguồn sự thật), không nằm ở Event log**. Đây là 1 sự phân tách quan trọng: nhầm lẫn "giữ Event lâu" với "có audit trail" là sai — audit trail đã được đảm bảo bởi chính các Aggregate immutable/append-only, không phụ thuộc Event retention.

---

## 9. Event Explainability Requirements

Áp dụng nguyên tắc đã rút ra ở [EVENT_CATALOG.md](EVENT_CATALOG.md) mục 2: **Event không phải là cơ chế explainability** — Event chỉ mang ID tham chiếu (vd: `assessment_result_id`), còn nội dung "vì sao" nằm ở Aggregate (`AssessmentResult.reasoning`) + `TraceLink`. Payload Event **không cần** (và không nên) chứa `reasoning` đầy đủ — chỉ cần đủ ID để Consumer tự truy vấn lại Aggregate gốc nếu cần biết "vì sao". Điều này giữ Event nhẹ (đúng nguyên tắc "Header phải tối giản" áp dụng tương tự ở đây) và tránh trùng lặp nguồn sự thật (1 bản trong Aggregate, 1 bản trong Event payload — vi phạm nguyên tắc "1 nguồn sự thật" đã giữ xuyên suốt từ [PersistenceArchitecture.md](PersistenceArchitecture.md) mục 2.2).

---

## 10. Event Auditing Requirements

Không cần audit log riêng cho Event tự thân (khác với Aggregate, vốn cần audit theo DECISION-027/048) — vì Event không phải nguồn sự thật (mục 1, 9). Nếu cần audit "Event nào đã được produce/consume lúc nào" cho mục đích vận hành (debug, SLA), đây là **Observability concern** (System Event, `ConsumerLagAlert`/`DeadLetterQueued`), không phải **Explainability concern** (đã có cơ chế riêng qua Aggregate+TraceLink) — 2 loại "audit" này không nên bị trộn vào 1 cơ chế.

---

## Task 4 — Rà soát 4 Trigger nghi vấn

| Trigger | A (thiếu Event) hay B (đã có Event đáp ứng)? | Phân tích |
|---|---|---|
| **knowledge-gap detection trigger** | **A — Thiếu thật, có thể định nghĩa ngay** (`KnowledgeGapDetected`) | Không có Event nào hiện tại đại diện đúng ngữ nghĩa "RoadmapNode cần độ sâu KnowledgeNode chưa có". Khác các trigger còn lại, cơ chế *phát hiện* gap này không phụ thuộc 1 mechanism chưa tồn tại nào khác — TeachingService/RoadmapMappingService đã có đủ dữ liệu (Mastery, RoadmapNode↔KnowledgeNode, KnowledgeEdge) để tự phát hiện điều kiện này ngay hôm nay. **Không tạo Event này ở Round này** (đúng giới hạn "Do NOT create new entities unless absolutely required") — chỉ xác nhận đây là ứng viên hợp lệ duy nhất trong 4 trigger có thể đóng *mà không cần chờ Decision/mechanism khác*. |
| **dependency-gap trigger** | **Không phải A, không phải B — sai phạm trù (category mismatch)** | Đây về bản chất là 1 **điều kiện trạng thái cần truy vấn liên tục** (so sánh `roadmap_node_knowledge_node` vs `knowledge_node_mastery` tại bất kỳ thời điểm nào), không phải 1 **sự việc xảy ra tại 1 thời điểm cụ thể**. Cố ép thành Event sẽ tạo ra 1 Event phải tự hỏi "khi nào nên phát ra" cho 1 điều kiện liên tục — không tự nhiên. Khuyến nghị (không chốt): nếu cần, đây nên là 1 **scheduled/triggered query** (RecommendationService tự đọc khi cần synthesize, như đã mô tả ở Flow 4) thay vì 1 Event riêng. |
| **pause-eligible trigger** | **A — Thiếu, và bị chặn (blocked)** | Phụ thuộc trực tiếp Stuck Detection (D9a) — cơ chế này hoàn toàn chưa tồn tại (Open Question #6/#11). Không thể đặt tên Event có ý nghĩa cho 1 điều kiện chưa được định nghĩa nội dung. Khác trigger đầu tiên, đây **không thể đóng ngay** dù được xác nhận là thiếu thật — phải chờ cơ chế Stuck Detection chốt trước. |
| **mode-change trigger** | **A — Thiếu, và bị chặn (blocked)** | Tương tự trigger trên — phụ thuộc nguồn tín hiệu D8 chưa được đặc tả (Round 4.1-4.3 Remaining Risk). Không thể đặt tên Event cho 1 input chưa biết là gì. |

**Tổng kết Task 4:** 1/4 trigger có thể đóng ngay ở Round tiếp theo (knowledge-gap), 2/4 bị chặn bởi mechanism khác chưa tồn tại (pause-eligible, mode-change — cùng nhóm phụ thuộc đã biết từ DECISION-048 Deferred Items), 1/4 không nên là Event ngay từ đầu (dependency-gap).

---

## Task 5 — Cross-check DECISION-027 / DECISION-038 / DECISION-048

| Decision | Yêu cầu | Event Architecture có tuân thủ không? |
|---|---|---|
| **DECISION-027** (Explainability First) | Mọi thay đổi Mastery/Recommendation/Knowledge Expansion phải truy vết được | **CÓ, tuân thủ — qua thiết kế gián tiếp đúng đắn:** Event không tự mang giải thích (mục 9), nhưng mang đủ ID để Consumer truy ngược Aggregate+`TraceLink`. Không có Event nào trong vocabulary làm suy yếu yêu cầu này. |
| **DECISION-038** (TraceLink, No Polymorphic FK) | `TraceLink` là cơ chế truy vết tập trung, không rải FK đa hình lên entity nghiệp vụ | **CÓ, tuân thủ — và được củng cố thêm ở Round này:** việc xác nhận `TraceLinkCreated` **không nên** là Event tiêu thụ async (mục 2 Catalog) trực tiếp bảo vệ nguyên tắc DECISION-038 — nếu `TraceLink` được ghi qua Event async, sẽ tái tạo đúng rủi ro Sync mà GAP-04/05/07 đã cảnh báo (decision record có thể tồn tại mà chưa có `TraceLink` tương ứng, do độ trễ async). |
| **DECISION-048** (All AI Decisions Must Be Explainable, Decision Persistence compatibility) | Explainability ≠ Persistence (2 trục độc lập); D8 dùng Runtime Reconstruction | **CÓ, tuân thủ — và là điểm xác nhận quan trọng nhất của Round này:** `MentorSessionModeChanged` (D8) được xác nhận **không cần payload mang lý do** (Explainability qua Runtime Reconstruction, không qua Event payload) — khớp đúng kết luận Round 4.1-4.2. Đồng thời, `DecisionRegistered` (Decision Header) cũng được xác nhận **không nên** là Event async (cùng lý do TraceLink) — bảo vệ nguyên tắc "Header/Detail phải atomic cùng nhau" (Round 4.4) khỏi bị vi phạm ngầm qua thiết kế Event sai. |

**Không phát hiện vi phạm nào** đối với 3 Decision trên — Event Architecture ở Round này **gia cố thêm** (không chỉ tuân thủ thụ động) các nguyên tắc đã khoá, bằng cách làm rõ tường minh "cái gì không nên là Event" (`TraceLink`/Header writes), điều mà 3 Decision gốc chưa từng cần nói rõ vì Event Architecture chưa tồn tại khi chúng được viết.

---

## Mandatory Questions — Trả lời tổng hợp

| # | Câu hỏi | Trả lời ngắn |
|---|---|---|
| 1 | Complete event vocabulary? | 16 Domain Event (đã khoá, CoreDomainMap mục 4) + 2 Application Event tuỳ chọn (`DecisionRegistered`, `TraceLinkCreated`) + 2 System Event minh hoạ + 4 candidate (1 đóng được ngay, 2 bị chặn, 1 sai phạm trù) — xem [EVENT_CATALOG.md](EVENT_CATALOG.md) |
| 2 | Which are Domain Events? | Toàn bộ 16 trong mục 1 Catalog |
| 3 | Which are Application Events? | `DecisionRegistered`, `TraceLinkCreated` (cả 2 tuỳ chọn, không bắt buộc tồn tại) |
| 4 | Which events should never be asynchronous? | **Không có Domain Event nào trong vocabulary chính thức cần Sync** — nhưng 2 "Application Event" (`DecisionRegistered`, `TraceLinkCreated`) **không nên được mô hình hoá như Event tiêu thụ async ngay từ đầu** — chúng là direct call, không phải Event theo đúng nghĩa propagation |
| 5 | Which events require ordering guarantees? | `LearningSession` lifecycle events (bắt buộc), `KnowledgeNodeExpanded` cùng node (khuyến nghị), `AssessmentResultCreated` cùng KnowledgeNode×Learner (khuyến nghị) — xem mục 6 |
| 6 | Which events require idempotency? | Tất cả — mô hình at-least-once áp dụng toàn vocabulary (mục 3, 7) |
| 7 | Which events are explainability-relevant? | `AssessmentResultCreated`, `KnowledgeRegressionDetected`, `SelfAssessmentMismatchDetected`, `RecommendationProposed`, `KnowledgeNodeExpanded` (cả 2 biến thể) — tất cả đều mang ID dẫn ngược tới Aggregate có `reasoning`/`TraceLink` |
| 8 | Which events create architectural bottlenecks? | `AssessmentResultCreated` (fan-out lớn nhất + điểm phụ thuộc của 3 luồng), `EvidenceRecorded` (điểm vào duy nhất của pipeline Assessment→Recommendation) — xem [EVENT_DEPENDENCY_MATRIX.md](EVENT_DEPENDENCY_MATRIX.md) mục 3 |
| 9 | Which events may create circular dependencies? | Không có cycle nào đã hiện thực hoá ở mức Event hôm nay; rủi ro tiềm ẩn (latent) đã biết từ Round Orchestration: Recommendation↔Teaching↔KnowledgeExpansion **nếu** Teaching/KnowledgeExpansion trong tương lai phát thêm Event phản hồi ngược về Recommendation — chưa tồn tại, chỉ cảnh báo trước |
| 10 | Which events are currently missing? | `KnowledgeGapDetected` (thiếu thật, đóng được ngay); pause-eligible và mode-change trigger events (thiếu, bị chặn bởi mechanism khác); dependency-gap (không nên là Event) — xem Task 4 |

---

## Final Section — Event Architecture Readiness Assessment

| Hạng mục | Điểm | Đánh giá |
|---|---|---|
| **DDL Finalization** | **~85/100, không đổi từ Round Consolidation** | Event Architecture không yêu cầu schema mới (mọi Event đều "không cần persist riêng", mục Catalog) — không ảnh hưởng tiêu cực hay tích cực tới DDL readiness đã có |
| **API Architecture** | **~15/100 → ~20/100 (nhẹ, do rõ thêm payload tối giản)** | Vocabulary Event giúp hình dung rõ hơn API nào cần publish/consume gì, nhưng vẫn 0% thiết kế API thật |
| **Supabase RLS** | **~30/100, không đổi** | Event Architecture không chạm RLS — Event không có bảng riêng cần Policy (đã xác nhận "không cần persist riêng" cho mọi Domain Event) |
| **Backend Modules** | **~25/100 → ~35/100** | Round này cung cấp vocabulary, ordering/idempotency/retention rule rõ ràng — đủ để bắt đầu thiết kế module Event Bus/Consumer cụ thể, dù chưa có dòng code; tăng đáng kể từ mức "chỉ có flow hành vi" của Round trước |
| **AI Orchestration** | **~30/100 → ~30/100, không đổi về điểm nhưng rõ hơn về bản chất rủi ro** | Round này không đóng được 2/4 trigger bị chặn (pause-eligible, mode-change) — đúng dự kiến, vì chúng phụ thuộc Stuck Detection/Mode Selection mechanism chưa tồn tại; đồng thời xác nhận thêm `KnowledgeGapDetected` là 1 gap thật có thể đóng độc lập, không phụ thuộc gì khác |

**Không hạng mục nào đạt "Ready" tuyệt đối sau Round này** — đúng bản chất Round Event Architecture: làm rõ vocabulary và quy tắc, không build. Cải thiện rõ nhất: Backend Modules (nay có đủ rule Ordering/Idempotency/Retention để thiết kế Event Bus cụ thể).

## Liên kết ngược

[EVENT_CATALOG.md](EVENT_CATALOG.md), [EVENT_DEPENDENCY_MATRIX.md](EVENT_DEPENDENCY_MATRIX.md), [APPLICATION_ORCHESTRATION_DESIGN.md](APPLICATION_ORCHESTRATION_DESIGN.md), [APPLICATION_ORCHESTRATION_REVIEW.md](APPLICATION_ORCHESTRATION_REVIEW.md), [DECISION-027-Explainability-First](../11_Decisions/DECISION-027-Explainability-First.md), [DECISION-038-Traceability-Model](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-048-All-AI-Decisions-Must-Be-Explainable](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md), [DECISION-035-No-Full-Event-Sourcing](../11_Decisions/DECISION-035-No-Full-Event-Sourcing.md).
