# Infrastructure Boundary Review — AI Mentor OS

> Phạm vi: Task 4 — xác định ranh giới Infrastructure / Application / Domain cho 7 hạng mục kỹ thuật được đề bài chỉ định. **Không thiết kế SQL/endpoint/code.** Kế thừa [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md), [HybridAIArchitectureReview.md](HybridAIArchitectureReview.md), [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md), [BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md) mục 3.

---

## 0. Khung phân loại 3 tầng dùng trong tài liệu này

| Tầng | Định nghĩa | Câu hỏi kiểm tra |
|---|---|---|
| **Domain** | Quy tắc/bất biến nghiệp vụ — đúng/sai không phụ thuộc công nghệ | "Nếu đổi toàn bộ stack kỹ thuật, quy tắc này còn đúng không?" — Có → Domain |
| **Application** | Điều phối/policy cụ thể hoá quy tắc Domain thành hành vi — phụ thuộc 1 phần vào ngữ cảnh hệ thống (event, transaction) nhưng không phụ thuộc công nghệ cụ thể | "Nếu đổi message queue/database engine, logic này có cần sửa không?" — Không (chỉ sửa implementation, không sửa policy) → Application |
| **Infrastructure** | Cơ chế kỹ thuật cụ thể — thay được hoàn toàn mà không đổi ý nghĩa nghiệp vụ | "Đây có phải 1 lựa chọn công nghệ có thể thay bằng công nghệ khác cùng vai trò?" — Có → Infrastructure |

---

## 1. Database Layer

| Tầng | Thành phần | Lý do |
|---|---|---|
| **Infrastructure** | PostgreSQL/Supabase connection, repository implementation, SQL query thật, connection pooling, migration tool | Thay Supabase bằng Postgres self-hosted khác không đổi ý nghĩa nghiệp vụ nào — đúng kết luận [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md) mục 0: "Domain Architecture... độc lập với hệ quản trị CSDL" |
| **Application** | Repository **interface** (port) — định nghĩa "cần lưu/đọc gì", không định nghĩa "lưu bằng câu SQL nào" | Interface thuộc Core Module (Application layer của chính Module đó), implementation thuộc Persistence Infrastructure Module |
| **Domain** | Aggregate Root, Entity, Invariant (vd "1 `KnowledgeNodeMastery` / Learner×KnowledgeNode") | Không đổi dù chạy trên bất kỳ database nào — đã chốt từ Domain Architecture Round 1-6, xác nhận lại ở SupabaseCompatibilityReview mục 0 |

**Kết luận:** Database Layer **chủ yếu Infrastructure**, với 1 lát mỏng Application (interface) làm lớp tiếp giáp với Domain.

---

## 2. Supabase Layer

| Tầng | Thành phần | Lý do |
|---|---|---|
| **Infrastructure** | Supabase Auth SDK integration, RLS Policy thực thi (cơ chế), PostgREST (nếu dùng cho phần đọc trực tiếp đã chốt ở [FRONTEND_BACKEND_INTERACTION_REVIEW.md](../07_API/FRONTEND_BACKEND_INTERACTION_REVIEW.md) mục 2.1) | Toàn bộ là cơ chế nền tảng do Supabase cung cấp, Backend chỉ tích hợp, không tự viết |
| **Application** | Quy tắc "khi nào cho phép đọc trực tiếp Supabase, khi nào phải qua Backend" (đã chốt ở [FRONTEND_BACKEND_INTERACTION_REVIEW.md](../07_API/FRONTEND_BACKEND_INTERACTION_REVIEW.md)) | Đây là **policy điều phối**, không phải cơ chế kỹ thuật — thuộc Application layer của Backend nói chung, không thuộc 1 Module cụ thể |
| **Domain** | `learner.id = auth.users.id` (DECISION-043) | Đây là 1 **quyết định kiến trúc đã khoá**, ảnh hưởng trực tiếp PK của Aggregate `Learner` — nằm ở biên giới Domain/Infrastructure, nhưng được phân loại Domain vì nó định nghĩa **danh tính** của Aggregate Root, không phải cơ chế lưu trữ |

**Kết luận:** Supabase Layer **tách 3 tầng rõ** — đây là hạng mục duy nhất trong 7 hạng mục có đại diện ở cả Domain/Application/Infrastructure đồng thời.

---

## 3. AI Provider Layer

| Tầng | Thành phần | Lý do |
|---|---|---|
| **Infrastructure** | Local AI in-process invocation, Cloud AI HTTP client tới `Apps/ai-service`/external LLM, retry/timeout cụ thể | Cơ chế gọi mô hình — DECISION-046 (Hybrid AI Execution Model) vẫn mở, nhưng bất kể chọn nào, đây luôn là Infrastructure (AI Provider Infrastructure Module, [BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md) mục 3.3) |
| **Application** | "Quyết định nào (D1-D9b) cần gọi AI, input nào truyền vào, output nào lấy ra" | Đây là logic của từng Application Service (TeachingService, AssessmentService...) — gọi AI Provider Infrastructure Module qua Port, không tự biết Local/Cloud |
| **Domain** | **Bản thân nội dung quyết định** (vd "tại sao chọn KnowledgeNode X cho D1") | Đây không phải "AI Provider" — đây là **AI Decision** (đã phân tích đầy đủ ở [AI_DECISION_TAXONOMY.md](AI_DECISION_TAXONOMY.md)), thuộc Domain vì nó là quy tắc nghiệp vụ (C1-C4), không phải cơ chế gọi mô hình |

**Điểm cần nhấn mạnh:** "AI Provider Layer" dễ bị nhầm là toàn bộ AI đều thuộc Infrastructure — **sai**. Chỉ **cơ chế invocation** (Local/Cloud, HTTP/in-process) là Infrastructure; **nội dung quyết định** vẫn là Domain/Application, đúng như toàn bộ DECISION-027/048 đã xác lập từ trước (Explainability áp dụng cho quyết định, không áp dụng cho cách gọi model).

---

## 4. Event Layer

| Tầng | Thành phần | Lý do |
|---|---|---|
| **Infrastructure** | Cơ chế publish/subscribe, message broker (nếu có), at-least-once/at-most-once delivery, dead-letter queue cụ thể | Event Bus Infrastructure Module ([BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md) mục 3.4) — đã xác nhận "không có chiến lược delivery guarantee/ordering/dedup nào được thiết kế" ở [APPLICATION_ORCHESTRATION_REVIEW.md](APPLICATION_ORCHESTRATION_REVIEW.md) mục 8, vẫn đúng ở Round này |
| **Application** | **Tên Event, Producer, Consumer, Trigger Condition, Payload** (đã chốt ở [EVENT_CATALOG.md](EVENT_CATALOG.md)) | Đây là **hợp đồng nghiệp vụ** giữa Module, không phụ thuộc cơ chế truyền tải cụ thể — đổi message broker không đổi tên/ý nghĩa Event |
| **Domain** | **Domain Event** (phân biệt với Application Event/System Event, [EVENT_CATALOG.md](EVENT_CATALOG.md) mục 0) — phản ánh thay đổi state có ý nghĩa nghiệp vụ | Domain Event là khái niệm DDD thuộc Domain layer; cách nó *di chuyển* (Infrastructure) khác cách nó *được định nghĩa* (Domain) |

**Kết luận:** Event Layer là ví dụ rõ nhất của khung 3 tầng — **what** (tên/ngữ nghĩa Event) là Domain, **when/who** (Producer/Consumer mapping) là Application, **how** (transport) là Infrastructure.

---

## 5. Background Jobs

| Tầng | Thành phần | Lý do |
|---|---|---|
| **Infrastructure** | Job runner, scheduler, retry mechanism, dead-letter queue processor | Background Jobs Infrastructure Module ([BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md) mục 3.5) |
| **Application** | "Bao nhiêu lần retry, retry cho Event nào, dead-letter sau bao lâu" | Policy cụ thể — vd RecommendationService cần dead-letter queue khi resume ([APPLICATION_SERVICE_BOUNDARY_MATRIX.md](APPLICATION_SERVICE_BOUNDARY_MATRIX.md) mục 5) là quyết định Application của Recommendation Module, không phải Background Jobs Module tự quyết |
| **Domain** | *(Không có)* | Background Jobs không có khái niệm Domain riêng — nó luôn phục vụ 1 quy tắc Domain/Application đã tồn tại ở Module khác (vd "đề xuất Recommendation không được mất", DECISION-019 ngụ ý), không tự sinh quy tắc nghiệp vụ mới |

---

## 6. Explainability Layer

| Tầng | Thành phần | Lý do |
|---|---|---|
| **Infrastructure** | Cơ chế lưu `trace_link` thật (bảng, index, query) | Persistence Infrastructure Module thực thi hộ |
| **Application** | **ExplainabilityService** — cơ chế gọi đồng bộ, atomic-with-caller, nhận `(source, target)` | Đây là **Supporting Module** (Application layer, không phải Infrastructure) — vì nó **thực thi 1 quy tắc nghiệp vụ** (mọi quyết định phải truy vết được), không chỉ là cơ chế lưu trữ thuần |
| **Domain** | **Explainability First** (DECISION-027/048), `TraceLink` model (DECISION-038) — quy tắc "quyết định nào cần trace, trace tới gì" | Đây là bất biến Domain cấp cao nhất của toàn hệ thống — không đổi dù implementation của ExplainabilityService thay đổi thế nào |

**Điểm quan trọng nhất của Round này:** **Explainability Layer KHÔNG thuộc Infrastructure** — đây là sai lầm phân loại dễ xảy ra nhất nếu chỉ nhìn tên "Layer". Explainability là **Supporting Application Module thực thi 1 Domain Invariant**, chỉ có *nơi lưu dữ liệu* (`trace_link` table) là Infrastructure. Nhầm Explainability thành Infrastructure sẽ dẫn tới rủi ro coi nó như "có thể tối ưu/bỏ qua khi cần performance" — sai hoàn toàn với DECISION-027/048.

---

## 7. Decision Persistence Layer

| Tầng | Thành phần | Lý do |
|---|---|---|
| **Infrastructure** | Cơ chế lưu Decision Header thật (khi mechanism được chọn) | Persistence Infrastructure Module |
| **Application** | **DecisionPersistenceService** — nhận `(decision_type, capability, learner_id, timestamp, reasoning_summary)`, ghi Header | Supporting Module, cùng lý do Explainability — thực thi quy tắc "mọi AI Decision phải được đăng ký", không chỉ lưu trữ |
| **Domain** | **AI Decision Taxonomy** (D1-D9b, C1-C4), yêu cầu Persistence Required/Recommended/Do Not Persist theo từng Decision Type | Bất biến Domain — phân loại này không đổi dù Decision Header được build bằng cơ chế nào |

**Cùng kết luận như mục 6:** Decision Persistence Layer **không thuộc Infrastructure** — là Supporting Application Module thực thi Domain Invariant (AI Decision Taxonomy).

---

## 8. Tổng hợp trả lời Mandatory Question 8-9

### Q8 — ExplainabilityService nên sống ở đâu?

**Trong `Apps/backend`, là 1 Supporting Module riêng (Explainability Module) — không nằm trong Infrastructure, không nằm trong bất kỳ Core Module nào.** Lý do:
1. Nó thực thi 1 Domain Invariant cấp hệ thống (DECISION-027/038/048), không phải cơ chế kỹ thuật thuần (mục 6).
2. Nó phải **bị gọi đồng bộ trong cùng transaction** với 4 Core Module khác nhau (Assessment, Recommendation, Knowledge Graph, Discovery) — nếu đặt trong Infrastructure (vd như 1 thư viện logging chung), rất dễ bị implement sai thành "ghi log sau, không cùng transaction", tái tạo đúng GAP-04/05/07 đã biết.
3. Đặt thành Module riêng (không gộp vào Core Module nào) giữ đúng tính chất "cross-cutting, không thuộc domain nghiệp vụ nào" (DECISION-038 Consequences).

### Q9 — DecisionPersistenceService nên sống ở đâu?

**Cùng vị trí kiến trúc với ExplainabilityService — `Apps/backend`, Supporting Module riêng (Decision Persistence Module), tách biệt khỏi Explainability Module** (không gộp 2 Module này, đúng kết luận [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md) mục 5 — "Không khuyến nghị gộp Header vào TraceLink, và không khuyến nghị gộp TraceLink vào Header"). Lý do tách Module dù cùng "loại" (cả 2 đều Supporting, cross-cutting):
1. Cardinality khác nhau (Header: 0/1 mỗi decision; TraceLink: 0..N quan hệ) — gộp Module sẽ tạo áp lực gộp luôn implementation, dẫn tới đúng rủi ro God Table đã cảnh báo.
2. Query pattern khác nhau (Header: timeline/inventory; TraceLink: edge lookup) — tách Module giữ rõ 2 trách nhiệm, dễ thay đổi độc lập.

---

## Liên kết ngược

[BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md), [MODULE_DEPENDENCY_MATRIX.md](MODULE_DEPENDENCY_MATRIX.md), [APPLICATION_LAYER_MAPPING.md](APPLICATION_LAYER_MAPPING.md), [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md), [HybridAIArchitectureReview.md](HybridAIArchitectureReview.md), [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md), [FRONTEND_BACKEND_INTERACTION_REVIEW.md](../07_API/FRONTEND_BACKEND_INTERACTION_REVIEW.md).
