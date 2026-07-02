# Backend Module Catalog — AI Mentor OS

> Phạm vi: **phân tích kiến trúc internal structure của `Apps/backend`.** Không thiết kế SQL/endpoint/controller/code. Mỗi Module dưới đây map 1-1 vào đúng 1 Core Domain ([CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 1/3/5) hoặc đúng 1 Capability/cross-cutting concern đã chốt ở [APPLICATION_SERVICES_ARCHITECTURE.md](APPLICATION_SERVICES_ARCHITECTURE.md) — không tạo Module mới ngoài những gì 2 tài liệu đó đã xác lập.

---

## 0. Phân loại Module dùng trong tài liệu này

| Loại | Định nghĩa | Tiêu chí |
|---|---|---|
| **Core Module** | Sở hữu ít nhất 1 Aggregate Root, tương ứng 1 Core Domain đã chốt ở CoreDomainMap mục 1 | Có write-ownership thật, có boundary nghiệp vụ độc lập |
| **Supporting Module** | Không sở hữu Aggregate Root nghiệp vụ riêng (hoặc chỉ là Projection), nhưng có vai trò Capability/cross-cutting rõ ràng đã chốt | Teaching (orchestration, không Domain), Explainability, Decision Persistence, Learning Profile (Projection) |
| **Infrastructure Module** | Thuần kỹ thuật — không mang quy tắc nghiệp vụ, chỉ là cơ chế truyền tải/lưu trữ/gọi ngoài | Database, Supabase Auth, AI Provider, Event Bus, Background Jobs |
| **Shared Component** | Không tự chạy nghiệp vụ, chỉ định nghĩa kiểu dữ liệu/contract dùng chung giữa nhiều Module khác | Shared Kernel |

---

## 1. Core Modules (9 — 1-1 với 9 Core Domain ghi, CoreDomainMap mục 1, trừ Learning Profile vì là Projection không ghi)

### 1.1 Identity Module

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Quản lý định danh Learner, cầu nối với Supabase Auth (`auth.users`), thực thi Right-to-be-Forgotten |
| **Owned Domain** | Identity |
| **Owned Services** | AccountLifecycleService |
| **Owned Events** | Không sinh Domain Event riêng (Learner không có lifecycle event chính thức trong Event Catalog) |
| **Owned Aggregates** | `Learner` |
| **Dependencies** | Không phụ thuộc Module nghiệp vụ nào khác — là Module nền tảng nhất, mọi Module khác phụ thuộc `learner_id` nhưng không phụ thuộc ngược lại |
| **Public Surface** | `GetLearnerProfile` (Query), `AnonymizeLearner` (Command) — đúng [COMMAND_QUERY_ARCHITECTURE.md](../07_API/COMMAND_QUERY_ARCHITECTURE.md) mục 1 |

### 1.2 Goal & Roadmap Module

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Sở hữu Goal (immutable, DECISION-032) và cấu trúc Roadmap cá nhân hoá; chọn KnowledgeNode nào RoadmapNode cần (D6) |
| **Owned Domain** | Goal & Roadmap |
| **Owned Services** | RoadmapMappingService |
| **Owned Events** | `GoalDefined`, `GoalArchived`, `RoadmapNodeProposed`, `RoadmapNodeApproved`, `RoadmapNodeRejected` |
| **Owned Aggregates** | `Goal`, `Roadmap` (gồm `RoadmapNode`, `ApprovalRecord`), `roadmap_node_knowledge_node` (write-owner đã chốt ở [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md) mục 1.1) |
| **Dependencies** | Đọc `KnowledgeNode` (Knowledge Graph Module, sync read, để xác nhận KnowledgeNode tồn tại trước khi map); gọi Decision Persistence Module (D6, khi mechanism tồn tại) |
| **Public Surface** | `DefineGoal`, `ArchiveGoalAndSupersede`, `ApproveRoadmapNode`/`RejectRoadmapNode`, `MapKnowledgeNodeToRoadmapNode` (Command); `GetActiveRoadmap`, `GetRoadmapProgress` (Query) |

### 1.3 Knowledge Graph Module

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Sở hữu KnowledgeNode/KnowledgeEdge (DAG, DECISION-025/039) và Controlled Expansion (D4/D5) |
| **Owned Domain** | Knowledge Graph |
| **Owned Services** | KnowledgeExpansionService |
| **Owned Events** | `KnowledgeNodeExpanded` (Local), `KnowledgeNodeExpanded` (Deep/Structural) |
| **Owned Aggregates** | `KnowledgeNode`, `KnowledgeEdge`, `ExpansionRecord` |
| **Dependencies** | Consume `RoadmapNodeApproved` (Goal & Roadmap Module, async event — **không** sync read ngược lại Goal & Roadmap); gọi Explainability Module (D4, atomic) |
| **Public Surface** | `GetKnowledgeGraphContext` (Query, qua Recursive CTE — DECISION-039); `GetExpansionReason` (Query); không có Command Public (Expansion luôn tự phát từ event nội bộ) |

### 1.4 Evidence Module

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Thu thập + phân loại bằng chứng thô (support/refute + weight) — **không đánh giá/phân loại Mastery** |
| **Owned Domain** | Evidence |
| **Owned Services** | EvidenceCaptureService |
| **Owned Events** | `EvidenceRecorded` |
| **Owned Aggregates** | `Evidence`, `EvidenceLink` |
| **Dependencies** | Không phụ thuộc Module nghiệp vụ nào khác — đây là Module "đầu nguồn" thuần, chỉ bị Module khác gọi tới (Mentor Interaction Module), không tự gọi ai |
| **Public Surface** | `SubmitLearnerResponse` (Command, thực thi qua EvidenceCaptureService); `GetEvidenceHistory` (Query) |

> **Lưu ý boundary quan trọng:** EvidenceCaptureService được **gọi từ trong** luồng MentorInteractionService (Learner phản hồi trong `MentorSession`) — nghĩa là **Mentor Interaction Module gọi đồng bộ vào Evidence Module's write surface**, không chỉ đọc. Đây là **ngoại lệ duy nhất** trong toàn hệ thống nơi 1 Core Module gọi sync-write vào Aggregate của Core Module khác trong cùng request — đã được ghi nhận từ [APPLICATION_SERVICES_ARCHITECTURE.md](APPLICATION_SERVICES_ARCHITECTURE.md) mục 2, phân tích rủi ro ở [MODULE_DEPENDENCY_MATRIX.md](MODULE_DEPENDENCY_MATRIX.md) mục 3.

### 1.5 Assessment Module

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Đánh giá Evidence, sinh `AssessmentResult`, **write-owner duy nhất** của `KnowledgeNodeMastery` (DECISION-026) |
| **Owned Domain** | Assessment |
| **Owned Services** | AssessmentService |
| **Owned Events** | `AssessmentResultCreated`, `KnowledgeRegressionDetected`, `MasteryLevelAchieved`/`TeachScoreUpdated` |
| **Owned Aggregates** | `AssessmentResult`, `KnowledgeNodeMastery` |
| **Dependencies** | Consume `EvidenceRecorded` (Evidence Module, async); gọi Explainability Module (atomic, GAP-04) |
| **Public Surface** | `GetAssessmentResults`, `GetCurrentMastery` (Query); không Command Public (luôn hệ quả nội bộ của Evidence) |

### 1.6 Discovery Module

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Goal Clarification, Competency Probing, phát hiện sai lệch tự đánh giá (D7) |
| **Owned Domain** | Discovery |
| **Owned Services** | DiscoveryService |
| **Owned Events** | `SelfAssessmentMismatchDetected` |
| **Owned Aggregates** | `DiscoverySession`, `SelfAssessmentMismatch` |
| **Dependencies** | Đọc `AssessmentResult`/`Evidence` lịch sử (Assessment Module, Evidence Module — read, Eventual); gọi Explainability Module (tự-trace, mới theo DECISION-048) |
| **Public Surface** | `SubmitSelfAssessment` (Command); `GetDiscoverySessions` (Query) |

### 1.7 Mentor Interaction Module

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Sở hữu vòng đời `MentorSession`, chọn/đổi Learning Mode (D8), trình bày nội dung do Teaching Module chọn |
| **Owned Domain** | Mentor Interaction |
| **Owned Services** | MentorInteractionService |
| **Owned Events** | `MentorSessionModeChanged` |
| **Owned Aggregates** | `MentorSession` |
| **Dependencies** | Gọi Evidence Module (sync write — xem lưu ý mục 1.4); đọc Teaching Module (nội dung được chọn); đọc Learning Session Module (context SubSession active) |
| **Public Surface** | `SubmitLearnerResponse` (Command, chuyển tiếp vào Evidence Module); `GetCurrentMentorSession` (Query, gồm Mode hiện tại) — **không có Command "ChangeMode"**, D8 là quyết định nội tại, không phải lệnh gọi từ ngoài |

### 1.8 Recommendation Module

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Tổng hợp tín hiệu rời rạc thành `RecommendationProposal` — chỉ đề xuất, không tự thực thi (DECISION-019) |
| **Owned Domain** | Recommendation |
| **Owned Services** | RecommendationService |
| **Owned Events** | `RecommendationProposed` (mọi subtype, kể cả "pause") |
| **Owned Aggregates** | `RecommendationProposal` |
| **Dependencies** | Consume `KnowledgeRegressionDetected` (Assessment Module), `SelfAssessmentMismatchDetected` (Discovery Module); đọc Goal & Roadmap Module + Knowledge Graph Module (dependency-gap query); đọc Learning Session Module (pause-eligible); gọi Explainability Module (atomic, không ngoại lệ) |
| **Public Surface** | `GetActiveRecommendations` (Query); không Command Public (DECISION-019) |

### 1.9 Learning Session Module

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | **Orchestrator** — điều phối Learner×Goal đang active, không ghi vào domain khác (DECISION-028) |
| **Owned Domain** | Learning Session |
| **Owned Services** | LearningSessionOrchestrationService |
| **Owned Events** | `LearningSessionStarted`/`Paused`/`Resumed`/`Completed`/`Archived`, `SubSessionStarted`/`Ended` |
| **Owned Aggregates** | `LearningSession` (gồm `SubSession[]`), `learning_session_transition` |
| **Dependencies** | Consume `GoalDefined`/`GoalArchived` (Goal & Roadmap Module); consume `RecommendationProposed` loại "pause" (Recommendation Module) |
| **Public Surface** | `StartLearningSession`/`PauseLearningSession`/`ResumeLearningSession`/`CompleteLearningSession`/`ArchiveLearningSession`, `ConfirmPauseRecommendation`, `StartSubSession`/`EndSubSession` (Command); `GetCurrentSession`, `GetSessionHistory` (Query) |

---

## 2. Supporting Modules (4)

### 2.1 Teaching Module

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Chọn nội dung dạy tiếp theo (D1) và mức can thiệp khi Stuck (D9b) — Capability điều phối, **không sở hữu Domain nào** (Round 3.9) |
| **Owned Domain** | Không có |
| **Owned Services** | TeachingService |
| **Owned Events** | Không sinh Domain Event nào (chỉ Application Event `DecisionRegistered`, tuỳ chọn, qua Decision Persistence Module) |
| **Owned Aggregates** | **Không có** — đúng Boundary Matrix mục 1 ("Không ghi Aggregate nghiệp vụ nào") |
| **Dependencies** | Đọc Goal & Roadmap Module, Knowledge Graph Module, Assessment Module, Recommendation Module, Mentor Interaction Module (Learning Mode hiện tại); gọi Decision Persistence Module (D1/D9b, khi mechanism tồn tại) |
| **Public Surface** | `GetSelectedContent` (Query, Projection) — không Command (Teaching chỉ chọn, kết quả được Mentor Interaction Module trình bày) |

### 2.2 Explainability Module

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Cơ chế ghi `TraceLink` duy nhất toàn hệ thống (DECISION-038) — hạ tầng cross-cutting thực thi backward provenance |
| **Owned Domain** | Không có (cross-cutting) |
| **Owned Services** | ExplainabilityService |
| **Owned Events** | `TraceLinkCreated` *(tuỳ chọn, nội bộ, không bắt buộc tồn tại)* |
| **Owned Aggregates** | `trace_link` |
| **Dependencies** | Không phụ thuộc Module nghiệp vụ nào — chỉ **bị gọi** bởi Assessment/Recommendation/Knowledge Graph/Discovery Module, luôn đồng bộ trong cùng transaction |
| **Public Surface** | **Không có Public Surface ra ngoài `Apps/backend`** — chỉ có Internal Surface: `WriteTraceLink(source, target)`, gọi nội bộ Module-to-Module |

### 2.3 Decision Persistence Module

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Đăng ký sự xuất hiện của 1 AI Decision (forward registry), bổ trợ không thay thế Explainability Module |
| **Owned Domain** | Không có (cross-cutting) |
| **Owned Services** | DecisionPersistenceService |
| **Owned Events** | `DecisionRegistered` *(tuỳ chọn)* |
| **Owned Aggregates** | Decision Header (mechanism pending — chưa có bảng thật, xem [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md)) |
| **Dependencies** | Không phụ thuộc Module nghiệp vụ nào — chỉ bị gọi bởi Teaching/Mentor Interaction/Discovery/Goal & Roadmap Module |
| **Public Surface** | **Không có Public Surface ra ngoài `Apps/backend`** — chỉ Internal Surface: `RegisterDecision(decision_type, capability, learner_id, reasoning_summary)` |

### 2.4 Learning Profile Module

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | View tổng hợp (Projection) từ Assessment + Discovery + Goal & Roadmap — **không có write path** (DECISION-036) |
| **Owned Domain** | Learning Profile *(Projection, không phải Domain ghi — CoreDomainMap mục 1 #9)* |
| **Owned Services** | Không có Service riêng — không cần (CoreDomainMap mục 26: "Không cần Service riêng cho LearningProfile") |
| **Owned Events** | Không có |
| **Owned Aggregates** | Không có — đọc lại/cache từ domain nguồn |
| **Dependencies** | Đọc Assessment Module, Discovery Module, Goal & Roadmap Module (read-only, Eventual) |
| **Public Surface** | `GetLearningProfile` (Query) — nếu cần cache, đó là chi tiết Infrastructure Module (mục 3.1), không phải trách nhiệm nghiệp vụ của Module này |

---

## 3. Infrastructure Modules (5)

### 3.1 Persistence Infrastructure Module

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Triển khai repository/data-access cho mọi Module nghiệp vụ — duy nhất nơi chạm SQL/PostgREST/Supabase Client thật |
| **Owned Domain** | Không có |
| **Owned Services** | Không có Application Service — chỉ chứa Repository implementation (1 implementation / Aggregate, do Core/Supporting Module sở hữu interface, Infrastructure Module sở hữu implementation — Dependency Inversion) |
| **Owned Events** | Không có |
| **Owned Aggregates** | Không có (Aggregate vẫn thuộc Core Module — Module này chỉ lưu/đọc hộ) |
| **Dependencies** | Không phụ thuộc Module nghiệp vụ nào — mọi Module nghiệp vụ phụ thuộc **interface** mà Module này implement (hướng phụ thuộc đảo ngược, xem [MODULE_DEPENDENCY_MATRIX.md](MODULE_DEPENDENCY_MATRIX.md) mục 1) |
| **Public Surface** | Không Public — chỉ Internal, implement interface do Core/Supporting Module định nghĩa |

### 3.2 Supabase Auth Integration Module

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Cầu nối `auth.users`, xác thực token, cung cấp `learner_id` (= `auth.users.id`, DECISION-043) cho mọi request |
| **Owned Domain** | Không có |
| **Owned Services** | Không có |
| **Owned Events** | Không có |
| **Owned Aggregates** | Không có (`auth.users` do Supabase quản lý, ngoài phạm vi Backend) |
| **Dependencies** | Không — chỉ bị gọi (middleware/cổng vào mọi request) |
| **Public Surface** | Không Public theo nghĩa nghiệp vụ — là middleware xác thực, được Identity Module dùng cho `AnonymizeLearner` (thứ tự thao tác, DECISION-043 Consequences) |

### 3.3 AI Provider Infrastructure Module

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Trừu tượng hoá invocation (Local AI in-process hoặc Cloud AI qua `Apps/ai-service`/external LLM) cho mọi Decision Type cần tính toán AI — DECISION-046 (Hybrid AI Execution Model) **vẫn là proposal mở**, Module này tồn tại như 1 boundary chờ quyết định đó, không tự chọn |
| **Owned Domain** | Không có |
| **Owned Services** | Không có Application Service — chỉ chứa AI Invocation Port/Adapter |
| **Owned Events** | Không có (không sinh Domain Event — Decision Type events do Core Module sinh, không phải Module này) |
| **Owned Aggregates** | Không có |
| **Dependencies** | Không phụ thuộc Module nghiệp vụ nào — bị gọi bởi Teaching/Assessment/Recommendation/Knowledge Graph/Discovery Module khi cần tính toán AI |
| **Public Surface** | Không Public — Internal Port: `Invoke(decision_type, inputs) → outputs`, implementation cụ thể (Local/Cloud) ẩn sau port này |

### 3.4 Event Bus Infrastructure Module

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Cơ chế truyền tải Domain Event (publish/subscribe) — **không định nghĩa tên/nội dung Event** (đó thuộc CoreDomainMap/Event Catalog, Domain/Application layer), chỉ định nghĩa **cách Event di chuyển** |
| **Owned Domain** | Không có |
| **Owned Services** | Không có |
| **Owned Events** | Không sở hữu Event nghiệp vụ nào — chỉ sở hữu System Event vận hành (`ConsumerLagAlert`, `DeadLetterQueued`, [EVENT_CATALOG.md](EVENT_CATALOG.md) mục 3) |
| **Owned Aggregates** | Không có |
| **Dependencies** | Không phụ thuộc Module nghiệp vụ nào — mọi Module Produce/Consume Event qua đây, không gọi trực tiếp Module khác cho phần Eventual |
| **Public Surface** | Không Public — Internal Port: `Publish(event)`, `Subscribe(event_type, handler)` |

### 3.5 Background Jobs Infrastructure Module

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Retry/dead-letter cho Event consumer thất bại (Boundary Matrix mục 5 — "RecommendationService cần retry/dead-letter queue khi resume"), không xử lý nghiệp vụ |
| **Owned Domain** | Không có |
| **Owned Services** | Không có |
| **Owned Events** | Không có (consume System Event từ Event Bus Infrastructure Module để quyết định retry) |
| **Owned Aggregates** | Không có |
| **Dependencies** | Phụ thuộc Event Bus Infrastructure Module (đọc dead-letter queue) — không phụ thuộc Module nghiệp vụ trực tiếp, chỉ "đánh thức lại" Module nghiệp vụ qua publish lại Event |
| **Public Surface** | Không Public |

---

## 4. Shared Component

### 4.1 Shared Kernel

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Định nghĩa kiểu dữ liệu/contract dùng chung — **không chứa logic nghiệp vụ của riêng domain nào** |
| **Nội dung** | `LearnerId` (UUID, đúng DECISION-043), Domain Event envelope (cấu trúc chung mọi event tuân theo — tên, `learner_id`, timestamp, payload), `DecisionType` enum (D1-D9b, đúng [AI_DECISION_TAXONOMY.md](AI_DECISION_TAXONOMY.md)), `TraceLink` reference contract (`source_type`/`source_id`/`target_type`/`target_id` shape — không phải bảng, chỉ là kiểu dữ liệu để mọi Module gọi Explainability Module đúng hình dạng) |
| **Owned Domain/Services/Events/Aggregates** | Không có — đây không phải Module thực thi, là Module định nghĩa kiểu |
| **Dependencies** | Không có — mọi Module khác phụ thuộc Shared Kernel, Shared Kernel không phụ thuộc ai (nguyên tắc bắt buộc, xem [MODULE_DEPENDENCY_MATRIX.md](MODULE_DEPENDENCY_MATRIX.md) mục 1) |
| **Public Surface** | Không Public — chỉ dùng nội bộ `Apps/backend` (và có thể `Apps/ai-service` nếu cần cùng kiểu `DecisionType`) |

---

## 5. Tổng hợp số lượng

| Loại | Số lượng | Danh sách |
|---|---|---|
| Core Module | 9 | Identity, Goal & Roadmap, Knowledge Graph, Evidence, Assessment, Discovery, Mentor Interaction, Recommendation, Learning Session |
| Supporting Module | 4 | Teaching, Explainability, Decision Persistence, Learning Profile |
| Infrastructure Module | 5 | Persistence, Supabase Auth Integration, AI Provider, Event Bus, Background Jobs |
| Shared Component | 1 | Shared Kernel |
| **Tổng** | **19** | |

**Không Module nào được tạo ngoài 12 Application Service + Learning Profile (không Service) đã chốt từ Round trước** — 9 Core + 4 Supporting = 13 Module nghiệp vụ, khớp đúng 12 Service + 1 Projection không-Service.

---

## Liên kết ngược

[MODULE_DEPENDENCY_MATRIX.md](MODULE_DEPENDENCY_MATRIX.md), [APPLICATION_LAYER_MAPPING.md](APPLICATION_LAYER_MAPPING.md), [INFRASTRUCTURE_BOUNDARY_REVIEW.md](INFRASTRUCTURE_BOUNDARY_REVIEW.md), [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md), [APPLICATION_SERVICES_ARCHITECTURE.md](APPLICATION_SERVICES_ARCHITECTURE.md), [API_BOUNDARY_ANALYSIS.md](../07_API/API_BOUNDARY_ANALYSIS.md), [COMMAND_QUERY_ARCHITECTURE.md](../07_API/COMMAND_QUERY_ARCHITECTURE.md).
