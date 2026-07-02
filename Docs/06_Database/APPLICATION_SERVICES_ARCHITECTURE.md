# Application Services Architecture (Round — Application Services Review)

> Phạm vi: phân tích kiến trúc. **Không thiết kế API, không thiết kế UI, không thiết kế SQL/DDL, không chốt quyết định.** Đóng khoảng trống đã xác định ở [ARCHITECTURE_CONSOLIDATION_REPORT.md](ARCHITECTURE_CONSOLIDATION_REPORT.md) mục 6 Risk #8: "Application Services layer chưa từng có 1 Round/Phase riêng" — nhiều ràng buộc (GAP-04, GAP-05, GAP-07, Header/TraceLink Sync Risk, Mode Selection input verification) đã bị đẩy về "Application Layer Discipline" qua nhiều Round mà chưa có service boundary cụ thể nào sở hữu chúng.

---

## 0. Nguyên tắc tổ chức Service

- **1 Application Service tương ứng 1 Capability hoặc 1 vai trò cross-cutting đã xác định** (Round 3.7-4.4) — không tạo Service mới ngoài những gì Domain/AI Architecture đã chốt; không gộp 2 Capability có write-ownership khác nhau vào 1 Service.
- **Service ≠ Domain.** Domain là khái niệm DDD (Aggregate Root, write-ownership) đã chốt ở CoreDomainMap; Service là đơn vị **thực thi** đứng trên 1 hoặc nhiều Domain (vd: `TeachingService` không sở hữu Domain nào, theo đúng kết luận Round 3.9 — Teaching là Capability điều phối). Mọi Service dưới đây tôn trọng đúng Write-Ownership đã khoá ở [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 5 — không Service nào được viết vào Aggregate không thuộc quyền của Domain nó đại diện.
- **9 Capability bắt buộc rà soát** (theo đề bài) đều có 1 Service tương ứng. Ngoài ra, 3 Service bổ sung (Roadmap Mapping, Evidence Capture, Account Lifecycle) được liệt kê ở mục 2 vì Objective 1 yêu cầu "identify ALL" — các Service này có write-ownership rõ nhưng không thuộc 9 mục bắt buộc nên chỉ được mô tả ngắn, không phân tích đủ 7 câu hỏi (việc đó dành cho [APPLICATION_ORCHESTRATION_REVIEW.md](APPLICATION_ORCHESTRATION_REVIEW.md), chỉ áp dụng cho 9 mục bắt buộc).

---

## 1. Service Catalog — 9 Capability bắt buộc

### 1.1 LearningSessionOrchestrationService

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Điều phối vòng đời `LearningSession`/`SubSession` cho 1 Learner×Goal đang active — không sở hữu nghiệp vụ của domain khác, chỉ đọc/điều phối (DECISION-028) |
| **Domain Ownership** | Learning Session (Orchestrator Domain) |
| **Responsibilities** | Start/Pause/Resume/Complete/Archive `LearningSession`; Start/End `SubSession`; ghi `learning_session_transition` (DECISION-047); áp dụng Goal-change → tạo `LearningSession` mới + archive cũ (DECISION-032); xác nhận Pause qua Learner sau khi nhận đề xuất Recommendation (DECISION-033, không tự động pause) |
| **Inputs** | Lệnh Learner (start/resume/confirm-pause), `RecommendationProposal` loại "pause", `GoalDefined`/`GoalArchived` |
| **Outputs** | `LearningSession`/`SubSession` state, `learning_session_transition` rows |
| **Events Produced** | `LearningSessionStarted`/`Paused`/`Resumed`/`Completed`/`Archived`, `SubSessionStarted`/`Ended` |
| **Events Consumed** | `RecommendationProposed` (type=pause), `GoalDefined`, `GoalArchived` |

### 1.2 AssessmentService

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Đánh giá `Evidence`/`EvidenceLink`, sinh `AssessmentResult`, là **write-owner duy nhất** của `KnowledgeNodeMastery` (DECISION-026) |
| **Domain Ownership** | Assessment |
| **Responsibilities** | Tính verdict/mastery_delta; ghi `AssessmentResult` (8 trường, DECISION-030); cập nhật `KnowledgeNodeMastery`; gọi **ExplainabilityService** để ghi `TraceLink` (AssessmentResult → Evidence/EvidenceLink) trong cùng transaction (đóng GAP-04) |
| **Inputs** | `EvidenceRecorded` (kèm `EvidenceLink[]`), `KnowledgeNodeMastery` hiện tại |
| **Outputs** | `AssessmentResult`, `KnowledgeNodeMastery` cập nhật, `TraceLink` (qua ExplainabilityService) |
| **Events Produced** | `AssessmentResultCreated`, `KnowledgeRegressionDetected`, `MasteryLevelAchieved`/`TeachScoreUpdated` |
| **Events Consumed** | `EvidenceRecorded` |

### 1.3 RecommendationService

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Tổng hợp tín hiệu rời rạc (Regression, Mismatch, dependency gap, pause signal) thành 1 `RecommendationProposal` — **chỉ đề xuất, không tự thực thi** (DECISION-019) |
| **Domain Ownership** | Recommendation |
| **Responsibilities** | Subscribe các signal event; tổng hợp; ghi `RecommendationProposal` + gọi **ExplainabilityService** để ghi `traced_to[]` (bắt buộc, không ngoại lệ — DECISION-027) trong cùng transaction |
| **Inputs** | `KnowledgeRegressionDetected`, `SelfAssessmentMismatchDetected`, truy vấn dependency-gap (Roadmap + Knowledge), tín hiệu pause-eligible từ Learning Session |
| **Outputs** | `RecommendationProposal`, `TraceLink` (qua ExplainabilityService) |
| **Events Produced** | `RecommendationProposed` (kể cả loại "pause") |
| **Events Consumed** | `KnowledgeRegressionDetected`, `SelfAssessmentMismatchDetected`, `AssessmentResultCreated` |

### 1.4 TeachingService

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Chọn nội dung dạy tiếp theo (D1 — Content Selection) và chọn mức can thiệp khi Stuck (D9b — Intervention Tier Selection) — **Capability điều phối, không sở hữu Domain nào** (Round 3.9) |
| **Domain Ownership** | Không có (orchestration) — đọc Goal & Roadmap, Knowledge Graph, Assessment, Recommendation |
| **Responsibilities** | Query `roadmap_node_knowledge_node` + `knowledge_node_mastery` + `knowledge_edge` + Learning Mode hiện tại (đọc từ Mentor Interaction); chọn nội dung/can thiệp; gọi **DecisionPersistenceService** để đăng ký D1/D9b (khi Shared Mechanism được chọn — hiện là GAP-01, chưa có nơi lưu) |
| **Inputs** | `SubSessionStarted`, `KnowledgeNodeMastery`, `RecommendationProposal` (nếu có), Roadmap dependency |
| **Outputs** | Lựa chọn nội dung/can thiệp (giao cho MentorInteractionService trình bày), (khi có cơ chế) Decision Header entry |
| **Events Produced** | (Pending Shared Mechanism) `DecisionRegistered(D1)`/`DecisionRegistered(D9b)` |
| **Events Consumed** | `SubSessionStarted`, `RecommendationProposed` |

### 1.5 KnowledgeExpansionService

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Mở rộng `KnowledgeNode` — 2 nhánh: Deep/Structural (D4, có `ExpansionRecord`) và Local (D5, không `ExpansionRecord`) — DECISION-023 |
| **Domain Ownership** | Knowledge Graph |
| **Responsibilities** | Deep/Structural: ghi `KnowledgeEdge` mới + `ExpansionRecord` **trong 1 transaction** (đóng 1 phần GAP-03 — cardinality cụ thể vẫn chờ Domain Architecture); Local: ghi `KnowledgeEdge` + (khi GAP-02 đóng) log lý do nội bộ |
| **Inputs** | Tín hiệu cần mở rộng (RoadmapNode đòi hỏi độ sâu lớn hơn hiện có, hoặc tín hiệu từ Teaching/Discovery) |
| **Outputs** | `KnowledgeEdge` mới, `ExpansionRecord` (Deep/Structural), (pending) log lý do Local |
| **Events Produced** | `KnowledgeNodeExpanded` (Local/Deep-Structural) |
| **Events Consumed** | `RoadmapNodeApproved` |

### 1.6 MentorInteractionService

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Sở hữu vòng đời `MentorSession`, chọn/đổi Learning Mode (D8 — quyết định nội tại của domain này, không phải Teaching — Round 3.9), tạo `Evidence` từ phản hồi Learner |
| **Domain Ownership** | Mentor Interaction |
| **Responsibilities** | Start/End `MentorSession`; ghi `MentorSessionModeChanged` (D8); trình bày nội dung đã chọn bởi TeachingService; tạo `Evidence`/`EvidenceLink` khi Learner phản hồi (**không tự phân loại/đánh giá** — đúng Domain Boundary CoreDomainMap mục 2); host tín hiệu Stuck Detection (D9a — ranh giới sở hữu với Teaching **chưa đóng**, Round 3.9 mục 3) |
| **Inputs** | Tin nhắn/phản hồi Learner, lựa chọn nội dung từ TeachingService |
| **Outputs** | `MentorSession` state, `Evidence`/`EvidenceLink` |
| **Events Produced** | `MentorSessionModeChanged`, `EvidenceRecorded` |
| **Events Consumed** | `SubSessionStarted` |

### 1.7 DiscoveryService

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Goal Clarification, Competency Probing, Continuous Discovery, phát hiện `SelfAssessmentMismatch` (D7) |
| **Domain Ownership** | Discovery |
| **Responsibilities** | So sánh self-assessment Learner vs `AssessmentResult`/`Evidence` quan sát được; ghi `DiscoverySession`/`SelfAssessmentMismatch`; gọi **ExplainabilityService** để tự explainable (yêu cầu mới từ DECISION-048 — Discovery không còn chỉ là điểm đến trace, phải tự giải thích) |
| **Inputs** | Self-assessment input Learner (nguồn cụ thể chưa chốt — Open Question #5), lịch sử `AssessmentResult`/`Evidence` |
| **Outputs** | `DiscoverySession`, `SelfAssessmentMismatch`, `TraceLink` (tự-trace) |
| **Events Produced** | `SelfAssessmentMismatchDetected` |
| **Events Consumed** | `AssessmentResultCreated` |

### 1.8 ExplainabilityService (TraceLink Writer)

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | **Cơ chế ghi `TraceLink` duy nhất trong toàn hệ thống** — không phải Domain, là hạ tầng cross-cutting (DECISION-038) thực thi truy vết ngược (backward provenance) |
| **Domain Ownership** | Không có (cross-cutting, giống định nghĩa `TraceLink` chính nó) |
| **Responsibilities** | Nhận `(source_type, source_id) → (target_type, target_id)` từ Service gọi (Assessment/Recommendation/KnowledgeExpansion/Discovery); ghi `TraceLink` **trong cùng transaction** với Service gọi — **đây chính là cách đóng GAP-07** (tập trung enforcement vào 1 Service thay vì để mỗi Capability tự nhớ tạo `trace_link`) |
| **Inputs** | Lệnh gọi đồng bộ (không phải event async — lý do ở mục [APPLICATION_ORCHESTRATION_REVIEW.md](APPLICATION_ORCHESTRATION_REVIEW.md)) từ AssessmentService/RecommendationService/KnowledgeExpansionService/DiscoveryService |
| **Outputs** | `TraceLink` rows |
| **Events Produced** | Không bắt buộc (ghi đồng bộ, không cần phát event cho hành vi này) |
| **Events Consumed** | Không — được **gọi trực tiếp** (function call/internal RPC trong cùng transaction), không qua message queue |

### 1.9 DecisionPersistenceService (Decision Header Writer)

| Thuộc tính | Giá trị |
|---|---|
| **Purpose** | Đăng ký **sự xuất hiện** của 1 AI Decision (forward registry) cho mọi Decision Type cần Header — bổ trợ, không thay thế ExplainabilityService (ranh giới đã đóng ở [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md)) |
| **Domain Ownership** | Không có (cross-cutting) |
| **Responsibilities** | Nhận `(decision_type, capability, learner_id, timestamp, reasoning_summary)` từ Service gọi (Teaching cho D1/D9b, MentorInteraction cho D8, Discovery cho D7, RoadmapMapping cho D6); ghi Decision Header row — **cơ chế lưu cụ thể chưa chốt** (Header/Detail vs khác, Round 3.6/4.3, chưa lock) nên Service này mô tả **vai trò**, không giả định bảng đã tồn tại |
| **Inputs** | Lệnh gọi từ TeachingService, MentorInteractionService (D8), DiscoveryService (D7), RoadmapMappingService (D6) |
| **Outputs** | Decision Header row (mechanism pending) |
| **Events Produced** | (Tuỳ chọn) `DecisionRegistered` |
| **Events Consumed** | Không — gọi trực tiếp, cùng lý do với ExplainabilityService (đồng bộ để tránh Sync Risk đã nêu ở Round 4.4) |

---

## 2. Service bổ sung (không thuộc 9 mục bắt buộc, vẫn cần để trả lời Objective 1 "identify ALL")

| Service | Domain | Vai trò ngắn | Vì sao không thuộc 9 mục bắt buộc |
|---|---|---|---|
| **RoadmapMappingService** | Goal & Roadmap | Chọn KnowledgeNode nào RoadmapNode cần (D6), ghi `roadmap_node_knowledge_node` + (nên có) `approval_record` trong 1 transaction (GAP-05) | Đề bài liệt kê "Knowledge Expansion" nhưng không liệt kê "Roadmap Mapping" tường minh — vẫn cần vì D6 tồn tại trong taxonomy đã khoá (DECISION-048) |
| **EvidenceCaptureService** | Evidence | Ghi `Evidence`/`EvidenceLink` thô — **không phân loại/đánh giá** (đúng Domain Boundary) — thực ra được gọi từ trong `MentorInteractionService` (Mentor Interaction là nơi Evidence "xảy ra" theo CoreDomainMap), nhưng write-ownership thuộc Evidence Domain riêng | Là 1 bước trong luồng Mentor Interaction, không phải 1 Capability bắt buộc rà soát riêng |
| **AccountLifecycleService** | Identity | Thực thi Right-to-be-Forgotten qua Anonymization (DECISION-037) — **bắt buộc Anonymize `learner` trước khi cho phép xoá `auth.users`**, không dựa cascade DB (DECISION-043 Consequences #3) | Identity không thuộc 7 Capability AI gốc — chỉ có 1 nghĩa vụ Application Layer cụ thể đã biết trước |

**Không cần Service riêng cho LearningProfile/Memory Profile** — đây là Projection (DECISION-036), không có write path, chỉ là 1 lớp đọc tổng hợp (Read Model) — nếu cần cache, đó là chi tiết Infrastructure, không phải 1 Application Service có trách nhiệm nghiệp vụ.

---

## 3. Cross-reference Event Produced ↔ Event Consumed

| Event | Produced by | Consumed by |
|---|---|---|
| `EvidenceRecorded` | MentorInteractionService | AssessmentService |
| `AssessmentResultCreated` | AssessmentService | RecommendationService, DiscoveryService, (Learning Profile — đọc trực tiếp, không phải consumer event thật) |
| `KnowledgeRegressionDetected` | AssessmentService | RecommendationService |
| `SelfAssessmentMismatchDetected` | DiscoveryService | RecommendationService |
| `RecommendationProposed` (mọi loại, kể cả pause) | RecommendationService | LearningSessionOrchestrationService (loại pause), TeachingService (gợi ý ôn tập) |
| `RoadmapNodeApproved` | RoadmapMappingService (qua Roadmap Governance) | KnowledgeExpansionService |
| `SubSessionStarted`/`Ended` | LearningSessionOrchestrationService | MentorInteractionService, TeachingService |
| `MentorSessionModeChanged` | MentorInteractionService | (không có consumer bắt buộc hiện tại — chỉ audit/Header) |
| `KnowledgeNodeExpanded` | KnowledgeExpansionService | RoadmapMappingService (đọc lại để biết KnowledgeNode mới tồn tại), MentorInteractionService (Deep/Structural — hiển thị lý do) |
| `GoalDefined`/`GoalArchived` | (Goal & Roadmap, ngoài phạm vi 9 Service bắt buộc) | LearningSessionOrchestrationService |

**Không có event nào được produce mà không có consumer nào** (ngoại trừ `MentorSessionModeChanged`, ghi nhận tường minh là chấp nhận được — D8 là Criticality C, Do Not Persist theo Round 3.8, không cần consumer event nào xử lý tiếp).

## Liên kết ngược

[APPLICATION_SERVICE_BOUNDARY_MATRIX.md](APPLICATION_SERVICE_BOUNDARY_MATRIX.md), [APPLICATION_ORCHESTRATION_REVIEW.md](APPLICATION_ORCHESTRATION_REVIEW.md), [ARCHITECTURE_CONSOLIDATION_REPORT.md](ARCHITECTURE_CONSOLIDATION_REPORT.md), [EXPLAINABILITY_GAP_ANALYSIS.md](EXPLAINABILITY_GAP_ANALYSIS.md), [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md), [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md).
