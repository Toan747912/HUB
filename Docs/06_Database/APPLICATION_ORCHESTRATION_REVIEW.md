# Application Orchestration Review — Cross-Flow Analysis & Readiness

> **Cập nhật:** tài liệu này trước đó (Round Application Services Review) chứa review 7-câu-hỏi theo từng Capability rời rạc — nội dung đó vẫn đúng và không bị mâu thuẫn, nhưng đã được **thay thế ở vị trí file này** bởi Cross-Flow Analysis theo đúng yêu cầu của Round hiện tại (Application Orchestration Design), vì 5 flow đầu-cuối ở [APPLICATION_ORCHESTRATION_DESIGN.md](APPLICATION_ORCHESTRATION_DESIGN.md) đã bao trùm lại toàn bộ nội dung 7-câu-hỏi cũ ở mức chi tiết hơn (per-flow, không chỉ per-capability). Không SQL/API/UI, không entity mới, không chốt quyết định.

---

## 1. Shared Services

| Service | Xuất hiện trong Flow | Mức độ chia sẻ |
|---|---|---|
| **ExplainabilityService** | F1 (×2 lần — Assessment và Recommendation), F3 (Deep/Structural), F4 | **Cao nhất** — 4/5 flow gọi tới, là Service được gọi nhiều nhất trong toàn hệ thống |
| **MentorInteractionService** | F1 (tạo Evidence), F2 (trình bày nội dung), F5 (đổi Mode) | Cao — Service duy nhất xuất hiện trong 3/5 flow, đóng vai trò "điểm chạm" trung tâm với Learner |
| **RecommendationService** | F1 (tail), F4 (toàn bộ) | Cao — F4 thực chất là F1's tail được tổng quát hoá cho nhiều nguồn signal khác, không phải 2 flow độc lập về service |
| **TeachingService** | F2 (toàn bộ), tiêu thụ `RecommendationProposed` từ F4, (giả định) nhận handoff D9b từ F5 | Trung bình — là điểm hội tụ của 3 flow khác nhau dù chỉ "sở hữu" 1 flow |
| **KnowledgeExpansionService** | F3 (toàn bộ) | Thấp — chỉ 1 flow, nhưng có thể được trigger từ nhiều nguồn (Teaching, RoadmapMapping, Discovery) |

**Quan sát:** `ExplainabilityService` và `MentorInteractionService` là 2 Service "trung tâm" thực sự của toàn hệ thống — không phải vì chúng làm nhiều nghiệp vụ nhất, mà vì **mọi flow khác đều phải đi qua chúng** ở 1 điểm nào đó.

---

## 2. Shared Events

| Event | Vai trò chia sẻ |
|---|---|
| `AssessmentResultCreated` / `KnowledgeRegressionDetected` | Là điểm nối trực tiếp F1 → F4 — về bản chất hành vi, đây là 1 chuỗi liên tục, không phải 2 flow tách biệt |
| `RecommendationProposed` | Là điểm nối F4 → F2 (subtype "review concept") và F4 → F5/Learning Session (subtype "pause") — 1 event nhưng rẽ nhánh tới 2 flow khác nhau tuỳ subtype |
| `SubSessionStarted` | Khởi động cả F2 (Teaching) và ngữ cảnh cho F5 (Mentor Interaction) — dù F5 không chính thức consume event này, nó cần `SubSession` đang active để có ý nghĩa |
| `KnowledgeNodeExpanded` | Nối F3 → (RoadmapMapping, ngoài 5 flow chính) và F3 → F5 (Deep/Structural cần hiển thị Learner qua MentorInteractionService) |

---

## 3. Bottlenecks

1. **ExplainabilityService** — mọi write có ý nghĩa explainability (4/5 flow) đi qua đây; nếu hiện thực hoá thành 1 network hop riêng (thay vì gọi nội bộ trong cùng process/transaction), đây sẽ là điểm nghẽn hiệu năng/độ trễ chung cho gần như mọi write quan trọng trong hệ thống — đúng như rủi ro "Header phải tối giản vĩnh viễn" đã cảnh báo từ Round Shared Decision Persistence, nay được xác nhận thêm ở góc nhìn flow thật.
2. **RecommendationService** — là consumer duy nhất của 4 loại signal khác nguồn (Assessment, Discovery, Roadmap+Knowledge query, Learning Session/Stuck) — phải tự xử lý vấn đề tổng hợp tín hiệu không đồng bộ, đến từ nhiều tốc độ khác nhau, mà không có cơ chế aggregation/debounce nào được thiết kế (Flow 4 mục 11) — rủi ro nghẽn logic (không phải nghẽn hiệu năng) nếu 4 nguồn signal trở nên dồn dập.

---

## 4. Race Conditions

| # | Race condition | Giữa Flow nào |
|---|---|---|
| 1 | Evidence-triggered Assessment Regression gợi ý ôn lại 1 `KnowledgeNode`, đồng thời Teaching-triggered Expansion đang mở rộng đúng node đó | F1 ↔ F3 |
| 2 | `RecommendationService` nhận gần đồng thời tín hiệu Regression (F1) và tín hiệu dependency-gap (F4 tự thân, từ Roadmap+Knowledge) về cùng 1 `KnowledgeNode` — rủi ro 2 `RecommendationProposal` trùng/mâu thuẫn | F1 ↔ F4 (nội tại) |
| 3 | `TeachingService` chọn nội dung dựa trên Learning Mode đọc được, đúng lúc `MentorInteractionService` đang giữa giao dịch đổi Mode (F5) — có thể đọc được Mode cũ hoặc mới tuỳ thời điểm, không có cơ chế đồng bộ giữa đọc và viết | F2 ↔ F5 |

---

## 5. Circular Dependencies

- **Không có chu trình (cycle) nào đã hiện thực hoá** trong 5 flow hiện tại — mọi luồng đều có hướng rõ (F1→F4→F2/F5, F3 độc lập).
- **Có 1 chu trình tiềm ẩn (latent), chưa hiện thực hoá, cần lưu ý trước khi mở rộng thêm:** `RecommendationService` (F4) có thể chỉ đạo `TeachingService` (F2) ôn lại 1 khái niệm; nếu `TeachingService` trong tương lai cũng có khả năng tự phát ra tín hiệu "gap" để trigger `KnowledgeExpansionService` (F3), và Expansion lại có thể tạo ra nội dung mới đủ để `RecommendationService` đề xuất tiếp ("giờ có nội dung mới, nên học") — đây tạo thành 1 vòng Recommendation ⇄ Teaching ⇄ Knowledge Expansion ⇄ Recommendation. **Không tồn tại hôm nay**, nhưng nếu 3 Service này được nối dây đầy đủ hơn ở Round sau mà không có điều kiện dừng (termination condition) rõ, rủi ro vòng lặp tín hiệu vô hạn là thật.

---

## 6. Transaction Risks

1. **Rủi ro lớn nhất: tính atomic của `ExplainabilityService` phụ thuộc vào 4 Service khác nhau (Assessment, Recommendation, KnowledgeExpansion, Discovery) đều tự giác gọi nó trong đúng transaction của mình.** Không có gì ở tầng dưới (DB) enforce điều này — đây là **chính xác hình thức hoá lại GAP-04/05/07** nhưng nay nhân với 4 điểm gọi thay vì 1 — nếu 1 trong 4 Service implement sai (gọi `ExplainabilityService` ngoài transaction, hoặc async-fire-and-forget), gap quay lại ngay tại đúng điểm đó.
2. **D8 (Flow 5) là ngoại lệ không tuân theo quy tắc "atomic với Detail"** — vì D8 không có Detail. Nếu 1 lập trình viên copy-paste pattern từ Flow 1/3/4 (luôn tìm Detail để atomic cùng) sang Flow 5, họ sẽ tìm 1 Detail không tồn tại — cần ghi chú tường minh ở code/tài liệu thiết kế chi tiết hơn để tránh nhầm lẫn, đã flag ở Design Doc Flow 5 mục 5.
3. **Recommendation synthesis (F4) không có transaction "chờ đủ signal"** — vì 4 nguồn signal độc lập, không có khái niệm "transaction chờ tổng hợp" trong mô hình quan hệ thông thường; cơ chế debounce/aggregation (nếu được thiết kế) sẽ phải nằm ở tầng logic Service, không thể biểu diễn bằng DB transaction.

---

## 7. Explainability Risks

1. **GAP-01 và GAP-02 vẫn mở sau khi thiết kế hành vi chi tiết (Flow 2, Flow 3-Local)** — Round này không đóng 2 gap đó, chỉ định vị chính xác *điểm* trong flow nơi explainability nên xảy ra nhưng hiện không xảy ra. Đây là kết quả mong đợi (Round này là "Architecture review only", không tự đóng gap), nhưng cần nói rõ: thiết kế hành vi đầy đủ hơn **không tự động đóng** 2 gap Critical đã biết từ Round 3.5.
2. **Flow 5 (D8) có 1 dạng rủi ro explainability chưa từng xuất hiện ở 4 flow khác: silent failure.** Mọi failure scenario ở F1-F4 đều có dấu hiệu lỗi rõ (transaction rollback, event không được consume, exception) — nhưng nếu điều kiện Runtime Reconstruction của D8 sai (input chưa từng persist ở đâu), **không có gì báo lỗi cả** — hệ thống vận hành "bình thường" cho tới khi có người hỏi "vì sao" và nhận câu trả lời rỗng/sai. Đây là rủi ro explainability nghiêm trọng nhất tìm được trong Round này, vì không thể phát hiện bằng monitoring lỗi thông thường.
3. **4 sự kiện/tín hiệu trigger không có tên chính thức** (mục 3, [APPLICATION_FLOW_SEQUENCE_MATRIX.md](APPLICATION_FLOW_SEQUENCE_MATRIX.md)) đồng nghĩa **không có điểm neo rõ ràng để bắt đầu truy vết "vì sao flow này chạy"** cho F3 và F5 — kể cả khi nội dung quyết định (D4/D5/D8) được explainable đầy đủ, câu hỏi "vì sao flow bắt đầu" vẫn có thể không trả lời được nếu trigger không được ghi nhận có cấu trúc.

---

## 8. Architecture Readiness Assessment (cập nhật từ Round Application Services Review)

| Hạng mục | Điểm (Round trước → Round này) | Lý do thay đổi |
|---|---|---|
| **Backend Implementation** | (mới, thay cho "Application Services" ~10) → **~25/100 — BEHAVIOR SPECIFIED, CODE NOT STARTED** | 5 flow đã có transaction boundary, sequence, failure scenario, retry strategy cụ thể ở mức hành vi — nâng đáng kể so với chỉ có Service Catalog (~10) — nhưng vẫn 0% code, 0% test |
| **API Design** | ~15/100 → **~15/100, không đổi, nhưng "Inputs Now Available"** | Round này không thiết kế API, nhưng đã làm rõ chính xác *hành động* nào 1 API cần expose (start SubSession, submit response...) — sẵn sàng hơn về mặt thông tin đầu vào, dù điểm số kỹ thuật chưa đổi |
| **Supabase RLS** | ~30/100 → **~30/100, không đổi** | Round này không chạm RLS — không có gì thay đổi |
| **Eventing** | (mới, thay cho điểm ẩn trong AI Orchestration trước đây) → **~25/100 — NAMES MOSTLY EXIST, NO DELIVERY/ORDERING SEMANTICS** | 8/12 event dùng trong 5 flow đã có tên chính thức trong Domain Events List; nhưng **không có chiến lược delivery guarantee, ordering, hay dedup nào được thiết kế** ở bất kỳ Round nào trước đây — Retry Strategy ở mục 11 mỗi flow chỉ là khuyến nghị, chưa là thiết kế |
| **AI Orchestration** | ~35/100 → **~30/100, giảm nhẹ vì rủi ro cụ thể hơn được phát hiện** | Round này không làm hệ thống "kém sẵn sàng hơn" — chỉ làm rõ thêm 2 rủi ro cụ thể chưa từng được định vị chính xác trước đây: silent failure của D8 (mục 7 #2) và circular dependency tiềm ẩn Recommendation↔Teaching↔KnowledgeExpansion (mục 5) — điểm giảm phản ánh "biết rõ rủi ro hơn", không phải "kiến trúc xấu đi" |

**Không hạng mục nào đạt mức "Ready for Implementation" sau Round này** — đúng dự kiến, vì đây là Round thiết kế hành vi (orchestration), không phải Round build. Mức tăng đáng kể nhất là Backend Implementation (10→25) vì giờ có đặc tả hành vi cụ thể để bắt đầu viết code/test theo, dù chưa có dòng code nào.

## Liên kết ngược

[APPLICATION_ORCHESTRATION_DESIGN.md](APPLICATION_ORCHESTRATION_DESIGN.md), [APPLICATION_FLOW_SEQUENCE_MATRIX.md](APPLICATION_FLOW_SEQUENCE_MATRIX.md), [APPLICATION_SERVICES_ARCHITECTURE.md](APPLICATION_SERVICES_ARCHITECTURE.md), [APPLICATION_SERVICE_BOUNDARY_MATRIX.md](APPLICATION_SERVICE_BOUNDARY_MATRIX.md), [ARCHITECTURE_CONSOLIDATION_REPORT.md](ARCHITECTURE_CONSOLIDATION_REPORT.md).
