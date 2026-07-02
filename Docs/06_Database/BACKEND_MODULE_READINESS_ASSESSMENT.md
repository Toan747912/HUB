# Backend Module Readiness Assessment — AI Mentor OS

> Phạm vi: Task 5 (cross-check) + Mandatory Questions + Final Readiness Section của Round Backend Module Architecture Review. **Không thiết kế SQL/endpoint/code.** Tổng hợp [BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md), [MODULE_DEPENDENCY_MATRIX.md](MODULE_DEPENDENCY_MATRIX.md), [APPLICATION_LAYER_MAPPING.md](APPLICATION_LAYER_MAPPING.md), [INFRASTRUCTURE_BOUNDARY_REVIEW.md](INFRASTRUCTURE_BOUNDARY_REVIEW.md).

---

## Task 5 — Cross-check với Domain / Application Services / Orchestration / Event / API Architecture

### 5.1 Module Ownership Consistency

| Kiểm tra | Kết quả |
|---|---|
| 9 Core Module khớp 1-1 với 9 Core Domain ghi ở CoreDomainMap mục 1 (trừ Learning Profile — Projection, không ghi) | ✅ Pass |
| 11 Aggregate Root (CoreDomainMap mục 3) đều có đúng 1 Module sở hữu, không Aggregate nào bị bỏ sót hoặc gán nhầm | ✅ Pass — đối chiếu trực tiếp BACKEND_MODULE_CATALOG mục 1 "Owned Aggregates" với CoreDomainMap mục 3 |
| Teaching Module xác nhận lại đúng "không sở hữu Aggregate" (Round 3.9, CAPABILITY_DOMAIN_OWNERSHIP_MATRIX) | ✅ Pass — không bị Round này vô tình gán Aggregate nào cho Teaching |
| Mode Selection (D8) thuộc Mentor Interaction Module, không phải Teaching Module (đúng tái xác nhận DECISION-048) | ✅ Pass |

### 5.2 Event Ownership Consistency

| Kiểm tra | Kết quả |
|---|---|
| 16 Domain Event (CoreDomainMap mục 4) đều có đúng 1 Producer Module | ✅ Pass — [APPLICATION_LAYER_MAPPING.md](APPLICATION_LAYER_MAPPING.md) mục 3 |
| Event Producer/Consumer ở Module Dependency Matrix khớp đúng hướng Allowed Dependencies, không Event nào ngụ ý 1 Forbidden Dependency | ✅ Pass — [MODULE_DEPENDENCY_MATRIX.md](MODULE_DEPENDENCY_MATRIX.md) mục 4, đối chiếu mục 3 |
| `KnowledgeNodeExpanded` (2 biến thể Local/Deep-Structural) vẫn cùng 1 Producer Module (Knowledge Graph), không tách thành 2 Module dù khác governance tier | ✅ Pass — đúng CoreDomainMap, không tạo phân tách Module không có cơ sở |
| 2 Application Event (`DecisionRegistered`, `TraceLinkCreated`) gắn đúng Decision Persistence Module / Explainability Module, không bị hiểu nhầm thành Domain Event | ✅ Pass |

### 5.3 Aggregate Ownership Consistency

| Kiểm tra | Kết quả |
|---|---|
| `KnowledgeNodeMastery` thuộc Assessment Module, không thuộc Knowledge Graph Module (đúng DECISION-026, dù tên gọi dễ gây nhầm) | ✅ Pass — giữ nguyên y như cách DDL_ROUND2_DESIGN đã từng phải làm rõ cùng điểm này |
| `roadmap_node_knowledge_node` thuộc Goal & Roadmap Module (write-owner), Knowledge Graph Module chỉ đọc — đúng [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md) mục 1.1 | ✅ Pass |
| `trace_link` thuộc Explainability Module duy nhất — không Core Module nào được liệt là "Owned Aggregate" cho `trace_link` dù chúng gọi tới nó thường xuyên | ✅ Pass — phân biệt rõ "gọi tới" vs "sở hữu ghi" |
| `learning_session_transition` thuộc Learning Session Module (Supporting Persistence Entity trong Aggregate `LearningSession`, DECISION-047), không tách Module riêng | ✅ Pass |

### 5.4 Đối chiếu riêng với API Architecture Review (Round trước)

| Kiểm tra | Kết quả |
|---|---|
| Public Surface của mỗi Module ([BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md) mục 1-2) khớp đúng Command/Query đã liệt ở [COMMAND_QUERY_ARCHITECTURE.md](../07_API/COMMAND_QUERY_ARCHITECTURE.md) — không Module nào lộ ra 1 Command/Query mới chưa từng xuất hiện ở Round API | ✅ Pass |
| Explainability Module và Decision Persistence Module xác nhận lại "không có Public Surface ra ngoài `Apps/backend`" — khớp [API_BOUNDARY_ANALYSIS.md](../07_API/API_BOUNDARY_ANALYSIS.md) mục 1.11-1.12 ("Never Public", "AI-Internal-Only") | ✅ Pass |
| Frontend↔Backend↔Supabase model ([FRONTEND_BACKEND_INTERACTION_REVIEW.md](../07_API/FRONTEND_BACKEND_INTERACTION_REVIEW.md)) khớp đúng Supabase Layer phân tích ở [INFRASTRUCTURE_BOUNDARY_REVIEW.md](INFRASTRUCTURE_BOUNDARY_REVIEW.md) mục 2 — không mâu thuẫn về việc Frontend được đọc trực tiếp gì | ✅ Pass |

**Kết luận Task 5: Không phát hiện vi phạm nào ở cả 4 mục kiểm tra.** Backend Module Architecture của Round này được xây hoàn toàn từ việc **map vào** kết luận đã chốt của 5 Round trước (Domain, Application Services, Orchestration, Event, API) — không phát sinh quy tắc/Module/Event/Aggregate mới nào đứng ngoài các Round đó.

---

## Mandatory Questions

**1. What are the backend modules?**
19 Module — 9 Core, 4 Supporting, 5 Infrastructure, 1 Shared Component. Danh sách đầy đủ: [BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md) mục 5.

**2. Which modules are Core?**
Identity, Goal & Roadmap, Knowledge Graph, Evidence, Assessment, Discovery, Mentor Interaction, Recommendation, Learning Session — mỗi Module sở hữu ít nhất 1 Aggregate Root, 1-1 với Core Domain CoreDomainMap mục 1.

**3. Which modules are Supporting?**
Teaching (orchestration capability, không Domain), Explainability (cross-cutting, thực thi DECISION-027/038/048), Decision Persistence (cross-cutting, thực thi AI Decision Taxonomy registry), Learning Profile (Projection, không write path).

**4. Which modules are Infrastructure?**
Persistence Infrastructure, Supabase Auth Integration, AI Provider Infrastructure, Event Bus Infrastructure, Background Jobs Infrastructure — thuần kỹ thuật, không mang quy tắc nghiệp vụ ([INFRASTRUCTURE_BOUNDARY_REVIEW.md](INFRASTRUCTURE_BOUNDARY_REVIEW.md)).

**5. Which module owns each Application Service?**
Ánh xạ đầy đủ 12 Service → 12 Module (Single Ownership xác nhận): [APPLICATION_LAYER_MAPPING.md](APPLICATION_LAYER_MAPPING.md) mục 1.

**6. Which module owns each Event?**
Ánh xạ đầy đủ 16 Domain Event + 2 Application Event → Producer Module: [MODULE_DEPENDENCY_MATRIX.md](MODULE_DEPENDENCY_MATRIX.md) mục 4, [APPLICATION_LAYER_MAPPING.md](APPLICATION_LAYER_MAPPING.md) mục 3.

**7. Which modules may never directly depend on each other?**
8 cặp Forbidden Dependency — quan trọng nhất: Knowledge Graph ↛ Goal & Roadmap (sync), Evidence ↛ Assessment (mọi hướng), Recommendation ↛ bất kỳ Module nào (write), Teaching ↛ bất kỳ Core Module nào (write), Explainability/Decision Persistence ↛ bất kỳ Module nghiệp vụ nào. Đầy đủ: [MODULE_DEPENDENCY_MATRIX.md](MODULE_DEPENDENCY_MATRIX.md) mục 3.

**8. Where should ExplainabilityService live?**
Supporting Module riêng (Explainability Module) trong `Apps/backend` — không thuộc Infrastructure, không thuộc Core Module nào. Phân tích đầy đủ: [INFRASTRUCTURE_BOUNDARY_REVIEW.md](INFRASTRUCTURE_BOUNDARY_REVIEW.md) mục 8 (Q8).

**9. Where should DecisionPersistenceService live?**
Supporting Module riêng (Decision Persistence Module), tách biệt khỏi Explainability Module (không gộp, đúng HEADER_TRACELINK_BOUNDARY_REVIEW). Phân tích đầy đủ: [INFRASTRUCTURE_BOUNDARY_REVIEW.md](INFRASTRUCTURE_BOUNDARY_REVIEW.md) mục 8 (Q9).

**10. What is the recommended Apps/backend structure?**

```
Apps/backend/
├── Modules/
│   ├── Identity/                  (Core)
│   ├── GoalRoadmap/                (Core)
│   ├── KnowledgeGraph/             (Core)
│   ├── Evidence/                   (Core)
│   ├── Assessment/                 (Core)
│   ├── Discovery/                  (Core)
│   ├── MentorInteraction/          (Core)
│   ├── Recommendation/             (Core)
│   ├── LearningSession/            (Core)
│   ├── Teaching/                   (Supporting)
│   ├── Explainability/             (Supporting)
│   ├── DecisionPersistence/        (Supporting)
│   └── LearningProfile/            (Supporting)
├── Infrastructure/
│   ├── Persistence/                 (Supabase Postgres repository implementations)
│   ├── SupabaseAuth/                (Auth integration)
│   ├── AIProvider/                  (Local/Cloud AI invocation adapter)
│   ├── EventBus/                    (publish/subscribe mechanism)
│   └── BackgroundJobs/               (retry/dead-letter)
└── SharedKernel/
    (LearnerId, DecisionType enum, Domain Event envelope, TraceLink reference contract)
```

Mỗi Module trong `Modules/` chỉ export đúng Public Surface đã định nghĩa ở [BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md) — không export trực tiếp Aggregate/Repository nội bộ. `Infrastructure/` chỉ implement interface do `Modules/` định nghĩa (Dependency Inversion, [MODULE_DEPENDENCY_MATRIX.md](MODULE_DEPENDENCY_MATRIX.md) nguyên tắc 2) — không Module nào trong `Modules/` import trực tiếp `Infrastructure/`. **Đây là cấu trúc thư mục minh hoạ khái niệm, không phải quyết định framework/ngôn ngữ cụ thể** — đúng giới hạn "Architecture review only, no code".

---

## BACKEND_MODULE_READINESS_ASSESSMENT

| Hạng mục | Điểm | Lý do |
|---|---|---|
| **Supabase RLS Design** | **~45/100 — MODULE-TO-TABLE OWNERSHIP CLEAR, POLICY GRANULARITY NOW KNOWN** | Tăng từ ~35/100 (Round API) vì giờ biết rõ **Module nào sở hữu bảng nào** (mục Owned Aggregates) — RLS Policy có thể được viết theo đúng ranh giới Module, không chỉ theo `learner_id` đơn lẻ; vẫn chưa viết policy SQL nào, và 2 Module cross-cutting (Explainability, Decision Persistence) cần RLS đặc biệt (không có `learner_id` trực tiếp dễ đoán — `trace_link` chỉ có `source_id`/`target_id` đa hình) chưa được phân tích ở Round này |
| **DDL Finalization** | **~35/100, tăng nhẹ** | Module boundary không tạo cột/bảng mới, nhưng xác nhận lại dứt khoát **bảng nào thuộc Module nào** — loại bỏ mọi mơ hồ "Knowledge Module nhưng write-owner Assessment" type nhầm lẫn đã từng xảy ra ở DDL_ROUND2_DESIGN; vẫn bị chặn bởi đúng các gap đã biết (GAP-01/02/05, Open Q#6/#11) |
| **Backend Implementation** | **~50/100 — MODULE BOUNDARY + DEPENDENCY DIRECTION FULLY SPECIFIED** | Tăng đáng kể từ ~30/100 (Round API) — đây là mức tăng lớn nhất trong toàn bộ chuỗi Round, vì giờ có đủ thông tin để **bắt đầu tạo cấu trúc thư mục/namespace thật** (mục 10) và biết chính xác module nào gọi module nào, qua đường nào (sync/async), cấm gì — vẫn 0% code, nhưng khoảng cách từ "biết phải viết gì" tới "viết được" đã ngắn hơn mọi Round trước |
| **Deployment Architecture** | **~20/100 — MODULE BOUNDARY KNOWN, DEPLOYMENT TOPOLOGY NOT DECIDED** | Mới đánh giá lần đầu ở Round này. Module Architecture chỉ trả lời "cấu trúc logic bên trong `Apps/backend`" — **không trả lời** monolith vs microservices, có tách `Apps/ai-service` thành process riêng hay không, scaling riêng cho Module nào (vd Explainability là bottleneck đã biết — có cần scale riêng?). 19 Module được thiết kế **độc lập với quyết định deployment** (đúng nguyên tắc Dependency Inversion), nên có thể bắt đầu monolith rồi tách dần — nhưng quyết định đó chưa được đánh giá ở Round nào |

**Không hạng mục nào đạt "Ready for Implementation"** — đúng dự kiến cho Round Module Architecture Review (vẫn là review boundary, chưa phải build). Backend Implementation có mức tăng lớn nhất (30→50) vì đây là Round đầu tiên trả lời được "cấu trúc thư mục cụ thể trông như thế nào" (mục 10) — điều kiện cần trực tiếp để bắt đầu viết code, dù chưa đủ để Ready.

### Điều kiện cần đóng trước khi chuyển sang Supabase RLS Design / DDL Finalization / Backend Implementation / Deployment Architecture

1. **Kế thừa từ Round API** (chưa đổi): GAP-01/02/05 (Decision Header mechanism), Open Q#6/#11 (Stuck Detection D9a/D9b), điều kiện Runtime Reconstruction D8 chưa xác minh, DECISION-046 (Hybrid AI) vẫn mở.
2. **Mới phát sinh ở Round này:** RLS Policy cho 2 Module cross-cutting (Explainability/Decision Persistence) cần thiết kế riêng — không có `learner_id` trực tiếp, cần 1 chiến lược RLS khác (vd JOIN qua bảng được trace tới) chưa từng được phân tích ở bất kỳ Round Database nào trước đây.
3. **Mới phát sinh ở Round này:** Deployment topology (monolith vs tách Module thành service riêng, đặc biệt cho Explainability — đã xác nhận là bottleneck ở Orchestration Review) chưa có Round nào đánh giá — cần 1 Round riêng (Deployment Architecture Review) trước khi Infrastructure Module (mục 3, BACKEND_MODULE_CATALOG) được quyết định triển khai như thế nào (cùng process hay tách container).
4. **Tight Coupling Mentor Interaction ↔ Evidence** ([MODULE_DEPENDENCY_MATRIX.md](MODULE_DEPENDENCY_MATRIX.md) mục 7 #1) — cần Founder/Lead Architect xác nhận đây là coupling chấp nhận được vĩnh viễn, hay cần 1 Round thiết kế lại (vd qua Saga/Outbox pattern) trước khi Backend Implementation thật bắt đầu cho 2 Module này.

---

## Liên kết ngược

[BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md), [MODULE_DEPENDENCY_MATRIX.md](MODULE_DEPENDENCY_MATRIX.md), [APPLICATION_LAYER_MAPPING.md](APPLICATION_LAYER_MAPPING.md), [INFRASTRUCTURE_BOUNDARY_REVIEW.md](INFRASTRUCTURE_BOUNDARY_REVIEW.md), [API_ARCHITECTURE_READINESS_ASSESSMENT.md](../07_API/API_ARCHITECTURE_READINESS_ASSESSMENT.md), [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md).
