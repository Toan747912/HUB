# Hybrid AI Architecture Review — AI Mentor OS

> Database Design Phase — **Pre-DDL Review**, kích hoạt bởi xác nhận của Founder: **AI Strategy = Hybrid AI (Local AI + Cloud AI)**. Đây là khái niệm **hoàn toàn mới** — không xuất hiện ở bất kỳ đâu trong [AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md), [PromptArchitecture_Draft.md](../05_Prompt_Architecture/PromptArchitecture_Draft.md), hay bất kỳ Decision đã khóa nào (đã rà soát toàn bộ — không có "Local AI"/"Cloud AI"/"Hybrid AI" trong Decision Log). Review này đánh giá tác động lên Domain Architecture/Database Design đã chốt, theo yêu cầu Task 2.
>
> **Không thiết kế SQL/Table/API ở tài liệu này.** Đề xuất DECISION-046 là **proposal**, không phải quyết định đã khóa.

## 0. Vấn đề cần làm rõ trước (Open Question, không tự giả định)

"Hybrid AI" có thể mang nhiều ý nghĩa kỹ thuật khác nhau — review này **không tự chọn 1 cách hiểu** mà liệt kê các khả năng và đánh giá tác động theo từng khả năng, vì Domain/Persistence impact khác nhau rất nhiều tùy cách hiểu:

| Cách hiểu khả dĩ | Domain impact nếu đúng |
|---|---|
| (A) Một số Capability chạy bằng model nhỏ/local (on-device hoặc self-hosted gần Edge), một số chạy bằng model lớn/cloud (API bên thứ 3) — **nhưng cả hai đều ghi trực tiếp, đồng bộ vào Supabase ngay khi có kết quả** | Thấp — chỉ là chi tiết hạ tầng thực thi AI, không đổi luồng dữ liệu |
| (B) Local AI có thể chạy **offline thực sự** (không có kết nối mạng tại thời điểm tạo Evidence/AssessmentResult), cần lưu tạm trên thiết bị rồi đồng bộ lên Supabase sau | Cao — phát sinh khái niệm "pending sync"/offline queue, ảnh hưởng tính append-only/immutable đã chốt (dữ liệu có thể "tồn tại" trước khi được Backend biết tới) |
| (C) Local AI chỉ là tối ưu chi phí/latency cho 1 số tác vụ phụ (ví dụ phân loại nhanh), không tạo ra Evidence/AssessmentResult chính thức — chỉ Cloud AI mới "quyết định" final | Thấp — Local AI không chạm dữ liệu nghiệp vụ persist, chỉ là tiền xử lý |

**Review này giả định (A) là trường hợp chính** (đồng bộ, không offline) vì đây là cách hiểu tối thiểu/an toàn nhất để đánh giá tác động — nếu thực tế là (B), cần quay lại đánh giá lại mục 3 (vì (B) **sẽ** phát sinh persistence requirement mới, không phải "không phát sinh" như kết luận ở mục 2). Đây là **câu hỏi đầu tiên cần Founder xác nhận**, ảnh hưởng trực tiếp tới việc Task 2 trả lời "có/không" đúng hay sai.

---

## 1. Rà soát Decision Log liên quan tới "AI thực thi" (không phải "AI là gì", mà "AI chạy ở đâu, ghi gì")

Các Decision/tài liệu hiện có đã nói về **AI ghi dữ liệu gì** (DECISION-027 Explainability First, DECISION-035 No Full Event Sourcing) nhưng **chưa từng nói AI chạy ở đâu** (local/cloud) — đây là 1 chiều hoàn toàn mới, không mâu thuẫn với decision cũ, chỉ là **thêm 1 thuộc tính chưa từng có**.

| Decision liên quan | Nội dung hiện tại | Có cần sửa vì Hybrid AI? |
|---|---|---|
| [DECISION-027-Explainability-First](../11_Decisions/DECISION-027-Explainability-First.md) | Mọi thay đổi Mastery/Recommendation/Expansion phải `traced_to[]` được tới Evidence/AssessmentResult/DiscoverySession | Không cần sửa nội dung — nhưng **nên mở rộng phạm vi "giải thích được"** để bao gồm cả "giải thích được AI nào (tier nào) đã tạo ra nó", xem mục 2 |
| [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 2 (ID Strategy) | "Evidence/AssessmentResult có thể được tạo từ AI Service, không chỉ Backend Core" — **đã dự đoán sẵn AI là 1 tác nhân tạo dữ liệu, từ Round/Step 3, trước khi biết Hybrid AI** | Không cần sửa — chỉ cần cụ thể hóa "AI Service" thành "Local AI"/"Cloud AI" ở tầng audit, xem mục 2 |
| [Database Design Step 4A.5](DatabaseNamingConvention.md) mục 10 (Audit Column Naming) | `CreatedByActorType` + `CreatedByActorId` — đã tách actor khỏi giả định "luôn là Learner", lý do nêu rõ "có thể là AI Service... không chỉ Backend Core" | **Cơ chế đã có sẵn, chỉ cần mở rộng danh sách giá trị `ActorType`** — xem mục 2 |

**Phát hiện quan trọng:** kiến trúc audit đã thiết kế ở Step 4A.5 (`ActorType`/`ActorId`) **vô tình đã chuẩn bị sẵn chỗ cho Hybrid AI** trước khi khái niệm này được xác nhận — vì lý do thiết kế ban đầu (tác nhân có thể là AI Service, không chỉ Learner/Backend) đã đúng hướng. Đây giảm đáng kể rủi ro phải sửa lại cấu trúc.

---

## 2. Task 2 — Hybrid AI có phát sinh Domain/Aggregate/Entity/Persistence requirement mới?

### 2.1 Domain mới?

**Không.** Hybrid AI là thuộc tính **thực thi** (execution concern — model nào, chạy ở đâu), không phải khái niệm **nghiệp vụ** (business concern — học gì, đánh giá gì, đề xuất gì). 10 Core Domain đã chốt ở [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) (Identity/Goal & Roadmap/Knowledge/Evidence/Assessment/Discovery/Mentor Interaction/Recommendation/Learning Session, + Memory Profile là Projection) đều định nghĩa theo **nghiệp vụ học tập**, không theo "ai/cái gì tạo ra dữ liệu" — việc 1 `Evidence` được tạo bởi Local AI hay Cloud AI không đổi việc nó vẫn là `Evidence` theo đúng nghĩa Evidence Domain đã chốt.

### 2.2 Aggregate mới?

**Không.** Không có nhu cầu 1 Aggregate Root mới để "quản lý" Local AI/Cloud AI như 1 thực thể nghiệp vụ độc lập (khác với ví dụ early-stage Evidence Engine ở Round 2, vốn phát sinh vì có **logic nghiệp vụ mới** — Evidence-Based Decay — không chỉ là chi tiết hạ tầng).

### 2.3 Entity mới?

**Không, với điều kiện cách hiểu (A) ở mục 0 đúng.** Nếu cách hiểu (B) đúng (Local AI có thể offline thật), **có khả năng cần** 1 khái niệm mới dạng "Pending Sync Record"/"Offline Capture Queue" — nhưng đây **chưa được xác nhận**, chỉ là khả năng có điều kiện, không tự thêm vào Logical Database Model ở review này.

**Không cần entity mới cho riêng "ghi nhận AI nào đã tạo ra 1 bản ghi"** — đã có chỗ sẵn ở audit columns (`ActorType`/`ActorId`, mục 1), không cần 1 bảng "AIExecutionLog" riêng cho mục đích thuần audit này (sẽ là trùng lặp dữ liệu — vi phạm nguyên tắc "1 nguồn sự thật" đã áp dụng xuyên Persistence Architecture).

### 2.4 Persistence requirement mới?

**Có 1, ở mức thuộc tính (không phải entity/bảng mới):** cần xác nhận liệu việc biết **"Evidence/AssessmentResult/RecommendationProposal/ExpansionRecord này do Local AI hay Cloud AI tạo ra"** có cần là 1 phần của **Explainability First** hay không — tức là: khi Learner hỏi "vì sao", câu trả lời có cần nói rõ "được đánh giá bởi model local hay model cloud" không?

- **Nếu CÓ:** `ActorType` enum (đã có sẵn cơ chế, mục 1) cần mở rộng để phân biệt rõ `LocalAI` và `CloudAI` (không chỉ gộp chung `AIService`) — đây **là** 1 persistence requirement mới, nhưng **không cần entity/bảng mới**, chỉ cần mở rộng 1 danh sách giá trị enum đã được thiết kế sẵn chỗ.
- **Nếu KHÔNG (chỉ là chi tiết vận hành/chi phí, không ảnh hưởng nghiệp vụ hiển thị cho Learner):** không cần sửa gì ở tầng Database Design — việc chọn model nào là quyết định runtime của AI Service, có thể log riêng ở Infrastructure/Observability (ngoài phạm vi Database Design Phase).

**Đây là Open Question, không tự quyết định ở review này** — nhưng độ phức tạp để đáp ứng "CÓ" rất thấp (mở rộng enum, không đổi cấu trúc), nên khuyến nghị xác nhận sớm để Step 4B chốt được danh sách giá trị `ActorType` đầy đủ ngay từ đầu (tránh phải `ALTER TYPE`/migrate enum sau).

---

## 3. Tổng hợp theo yêu cầu Output

### 3.1 Những gì cần sửa

| # | Hạng mục | Điều kiện |
|---|---|---|
| 1 | Danh sách giá trị enum `ActorType` (Audit Strategy, Step 4A.5 mục 10) | Cần mở rộng để có `LocalAI`/`CloudAI` (thay vì chỉ `AIService` gộp chung) — **nếu** Founder xác nhận Explainability cần phân biệt tier AI (mục 2.4) |

### 3.2 Những gì giữ nguyên

| # | Hạng mục | Lý do |
|---|---|---|
| 1 | 10 Core Domain ([CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md)) | Hybrid AI là execution concern, không phải business concern |
| 2 | 19 entity ([DatabaseBlueprint.md](DatabaseBlueprint.md)) | Không entity nào cần đổi định nghĩa |
| 3 | 13 Capability ([AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md) mục 2) | Capability vẫn định nghĩa theo "làm gì" (Teaching, Assessment...), không theo "chạy ở đâu" — Hybrid AI là 1 chiều routing/triển khai bên dưới mỗi Capability, không thay thế hay thêm Capability mới |
| 4 | `TraceLink`/Explainability First (cơ chế truy vết nghiệp vụ) | Provenance kỹ thuật (model/tier nào chạy) là 1 trục khác với truy vết nghiệp vụ (Evidence nào dẫn tới kết luận nào) — không trộn 2 khái niệm vào `TraceLink` |
| 5 | Cấu trúc Audit `ActorType`/`ActorId` (chỉ giá trị enum có thể cần mở rộng, không đổi cấu trúc 2 cột) | Đã thiết kế đủ tổng quát từ Step 4A.5 |

### 3.3 Những gì phát sinh mới

| # | Phát sinh | Loại |
|---|---|---|
| 1 | Câu hỏi "Hybrid AI có offline thực sự không" (mục 0, cách hiểu B) | **Open Question quan trọng nhất** — quyết định toàn bộ kết luận của review này có còn đúng hay không |
| 2 | Câu hỏi "Explainability First có cần phân biệt Local/Cloud AI không" (mục 2.4) | Open Question, ảnh hưởng hẹp (1 enum), độ phức tạp thấp để đáp ứng |
| 3 | (Tùy chọn, không bắt buộc) Nhu cầu log vận hành (cost/latency theo model) | Khả năng là Infrastructure/Observability concern, không phải Database Design — chỉ ghi nhận, không đề xuất entity |

**Không phát sinh Domain/Aggregate/Entity mới nào trong cách hiểu (A)** — nếu cách hiểu (B) (offline thật) được xác nhận đúng, **kết luận này phải được xem lại**, vì (B) thực sự phát sinh nhu cầu persistence mới (offline queue/pending sync).

### 3.4 Mức độ ảnh hưởng

| Hạng mục | Mức độ | Điều kiện |
|---|---|---|
| Domain/Aggregate/Entity hiện có | **None** | Trong cách hiểu (A) |
| Mở rộng enum `ActorType` | **Low** | Nếu Founder xác nhận cần phân biệt Local/Cloud AI cho Explainability |
| Toàn bộ Database Design Phase, NẾU cách hiểu (B) đúng (offline thật) | **High** (chưa xảy ra, chỉ là rủi ro có điều kiện) | Chưa xác nhận — xem mục 0 |

---

## 4. Đề xuất Decision Log (TASK 3 — chỉ đề xuất, không tự chốt)

| Đề xuất | Nội dung cần Founder/ChatGPT xác nhận |
|---|---|
| **DECISION-046 (đề xuất)** | Hybrid AI Execution Model — xác nhận: (a) Local AI có bao giờ chạy offline (không có kết nối tới Supabase tại thời điểm tạo dữ liệu) hay luôn đồng bộ thời gian thực; (b) Explainability First (DECISION-027) có cần phân biệt rõ "Local AI hay Cloud AI đã tạo ra Evidence/AssessmentResult/RecommendationProposal/ExpansionRecord này" hay không — nếu có, mở rộng `ActorType` enum (`LocalAI`/`CloudAI`, có thể kèm `ModelIdentifier` để biết chính xác model nào) |

**Không đề xuất thêm Domain/Aggregate/Entity nào** — nếu DECISION-046 phần (a) xác nhận có offline thật, **review này cần làm lại** với 1 đề xuất bổ sung (ví dụ DECISION-047 cho Offline Sync Strategy) — chưa đề xuất trước vì chưa có xác nhận.

## 5. DDL Readiness

**READY** (đối với Domain/Entity Architecture) — **với 1 lưu ý**

Lý do READY: cách hiểu (A) là trường hợp mặc định hợp lý nhất, và trong cách hiểu đó, **không có Domain/Aggregate/Entity nào cần thêm/sửa** — toàn bộ [DatabaseBlueprint.md](DatabaseBlueprint.md) (Step 4A) vẫn đúng nguyên trạng. Hybrid AI không tự nó là 1 blocker cho việc viết DDL cho 19 entity đã chốt.

**Lưu ý duy nhất ảnh hưởng DDL cụ thể:** nếu Step 4B viết CHECK constraint/ENUM cho cột `ActorType` (đã có trong Audit Strategy, Step 4A.5) **trước khi** Founder xác nhận DECISION-046 phần (b), danh sách giá trị có thể thiếu `LocalAI`/`CloudAI` và cần `ALTER TYPE`/migration sau — khuyến nghị xác nhận DECISION-046 **trước khi** Step 4B viết cụ thể enum này, nhưng **không cần** trì hoãn toàn bộ Step 4B vì lý do này (chỉ ảnh hưởng 1 enum, không ảnh hưởng việc bảng có tồn tại được hay không).

**Nếu cách hiểu (B) (offline thật) được xác nhận đúng ở bất kỳ thời điểm nào sau này — đánh giá NOT READY cần được lập lại cho riêng phần đó**, không tự động áp dụng ngược cho toàn bộ Database Design Phase đã hoàn thành.

## Liên kết ngược

[AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md), [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md), [DatabaseBlueprint.md](DatabaseBlueprint.md), [DatabaseNamingConvention.md](DatabaseNamingConvention.md), [DECISION-027-Explainability-First](../11_Decisions/DECISION-027-Explainability-First.md), [DECISION-035-No-Full-Event-Sourcing](../11_Decisions/DECISION-035-No-Full-Event-Sourcing.md), [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md).
