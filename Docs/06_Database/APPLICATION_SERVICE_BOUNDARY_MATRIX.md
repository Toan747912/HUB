# Application Service Boundary Matrix (Round — Application Services Review)

> Phạm vi: phân tích kiến trúc. Không thiết kế API/UI/SQL/DDL. Không chốt quyết định. Ma trận này trả lời trực tiếp Objective 3-7 của đề bài: transaction boundary, consistency requirement, atomic vs eventual operations, và mapping "Application Layer Discipline" → Service cụ thể.

---

## 1. Service × Domain × Aggregate Matrix

| Service | Domain Owner | Aggregate(s) Modified | Consistency Model |
|---|---|---|---|
| LearningSessionOrchestrationService | Learning Session | `LearningSession`, `SubSession` | Strong (trong phạm vi 1 Learner×Goal) |
| AssessmentService | Assessment | `AssessmentResult`, `KnowledgeNodeMastery` | Strong |
| RecommendationService | Recommendation | `RecommendationProposal` | Strong (cho việc ghi proposal), Eventual (cho tín hiệu đầu vào) |
| TeachingService | Không có (orchestration) | Không ghi Aggregate nghiệp vụ nào — (pending) Decision Header | Eventual (đọc), Strong khi ghi Header |
| KnowledgeExpansionService | Knowledge Graph | `KnowledgeNode`, `KnowledgeEdge`, `ExpansionRecord` | Strong |
| MentorInteractionService | Mentor Interaction | `MentorSession`, `Evidence`/`EvidenceLink` | Strong (Mode/Evidence ghi); Eventual (việc Assessment xử lý Evidence sau đó) |
| DiscoveryService | Discovery | `DiscoverySession`, `SelfAssessmentMismatch` | Strong (ghi), Eventual (so sánh với Assessment history) |
| ExplainabilityService | Không có (cross-cutting) | `TraceLink` | Strong — luôn cùng transaction với Service gọi |
| DecisionPersistenceService | Không có (cross-cutting) | Decision Header (mechanism pending) | Strong — luôn cùng transaction với Detail (nếu có) |
| RoadmapMappingService *(bổ sung)* | Goal & Roadmap | `Roadmap`, `RoadmapNode`, `ApprovalRecord`, `roadmap_node_knowledge_node` | Strong |

---

## 2. Transaction Boundaries — Phải Atomic (Objective 5)

| # | Nhóm ghi phải atomic (1 transaction) | Service chịu trách nhiệm | GAP/Decision liên quan |
|---|---|---|---|
| 1 | `AssessmentResult` + `KnowledgeNodeMastery` update + `TraceLink` (→ Evidence/EvidenceLink) | AssessmentService (gọi ExplainabilityService trong cùng transaction) | **GAP-04**, DECISION-026/030/038 |
| 2 | `RecommendationProposal` + `TraceLink` (`traced_to[]`) | RecommendationService (gọi ExplainabilityService) | DECISION-027 — không có ngoại lệ, kể cả loại "pause" (DECISION-033) |
| 3 | `KnowledgeEdge` mới + `ExpansionRecord` (Deep/Structural) | KnowledgeExpansionService | **GAP-03** (cardinality cụ thể vẫn chờ Domain Architecture, nhưng "cùng transaction" đã là yêu cầu rõ dù chưa chốt cardinality) |
| 4 | `roadmap_node_knowledge_node` + `ApprovalRecord` (khi Roadmap Governance áp dụng) | RoadmapMappingService | **GAP-05** |
| 5 | `LearningSession`/`SubSession` state transition + `learning_session_transition` log row | LearningSessionOrchestrationService | DECISION-047 |
| 6 | `DiscoverySession`/`SelfAssessmentMismatch` + `TraceLink` (tự-trace, mới theo DECISION-048) | DiscoveryService | D7 requirement mới (DECISION-048) |
| 7 | **Decision Header + Detail tương ứng (khi Detail tồn tại)** | Service sở hữu Detail đó, gọi DecisionPersistenceService trong cùng transaction | **Header/TraceLink Sync Risk** ([HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md) mục 4 Risk #1) |
| 8 | `MentorSession.mode` update (D8) — atomic tự thân (1 row), không cần ràng buộc nhóm khác | MentorInteractionService | D8, Criticality C — atomic chỉ vì là 1 write đơn, không phải vì rủi ro cao |

**Nguyên tắc chung rút ra:** mọi cặp "(bản ghi kết luận nghiệp vụ) + (bản ghi lý do/truy vết tương ứng)" phải atomic — đây chính là hình thức hoá của toàn bộ GAP-03/04/05/07 đã lặp lại nhiều lần qua các Round trước thành 1 quy tắc duy nhất, gắn cho đúng Service chịu trách nhiệm.

---

## 3. Có thể Eventual Consistency (Objective 6)

| # | Hoạt động | Vì sao chấp nhận eventual | Service liên quan |
|---|---|---|---|
| 1 | `EvidenceRecorded` → AssessmentService xử lý | CoreDomainMap Round 4 đã xác nhận Assessment là **consumer chính qua Domain Event**, không phải đồng bộ cùng transaction với việc tạo Evidence | MentorInteractionService → AssessmentService |
| 2 | `AssessmentResultCreated`/`KnowledgeRegressionDetected` → RecommendationService tổng hợp | Recommendation luôn ở dạng đề xuất (Proposal-Only, DECISION-019) — không có yêu cầu nghiệp vụ nào cần đề xuất xuất hiện ngay lập tức cùng giao dịch với Assessment | AssessmentService → RecommendationService |
| 3 | TeachingService đọc `KnowledgeNodeMastery`/Roadmap/Recommendation để chọn nội dung | Chọn nội dung dựa trên snapshot hơi cũ vài giây/phút không gây hậu quả nghiêm trọng — khác hẳn việc *ghi* Mastery (phải Strong) | TeachingService (read-only) |
| 4 | `LearningProfile`/Memory Profile (Projection) | Theo định nghĩa là Read Model — DECISION-036 đã xác nhận không có write path riêng, luôn tính lại/cache từ domain nguồn | Không có Service ghi — bản chất Eventual |
| 5 | DiscoveryService so sánh self-assessment vs lịch sử AssessmentResult | Không cần real-time đồng bộ với Assessment để phát hiện mismatch — phát hiện trễ vài phút/giờ vẫn có giá trị | DiscoveryService (read-only phía Assessment) |
| 6 | `KnowledgeNodeExpanded` → RoadmapMappingService đọc lại để biết KnowledgeNode mới | Roadmap không cần biết ngay lập tức trong cùng transaction Expansion — việc gắn KnowledgeNode mới vào Roadmap là 1 quyết định riêng (D6), xảy ra sau | KnowledgeExpansionService → RoadmapMappingService |

---

## 4. "Application Layer Discipline" Dependency Map (Objective 7)

> Mọi điểm từng được các Round trước flag là "phụ thuộc Application Layer, không có cơ chế DB enforce" — ánh xạ chính xác về 1 Service chịu trách nhiệm.

| Gap/Risk (nguồn) | Nội dung | Service chịu trách nhiệm đóng | Cơ chế đề xuất |
|---|---|---|---|
| **GAP-01** (Round 3.5) | Teaching không persist quyết định nào | TeachingService → DecisionPersistenceService | Đăng ký D1 vào Decision Header khi mechanism được chọn (Round 3.6/4.3, chưa chốt) |
| **GAP-02** (Round 3.5) | Local Expansion không có nơi lưu lý do nội bộ | KnowledgeExpansionService | Thêm bước ghi log nội bộ trong cùng transaction với `KnowledgeEdge` (chờ Open Question #21 đóng) |
| **GAP-03** (Round 3) | `ExpansionRecord` không trace tới `KnowledgeEdge` cụ thể | KnowledgeExpansionService | Đảm bảo atomic write (mục 2 #3) — cardinality cụ thể vẫn chờ Domain Architecture, nhưng Service-level discipline đã xác định rõ |
| **GAP-04** (Round 2) | `AssessmentResult` → Evidence chỉ qua `trace_link`, không FK enforce | AssessmentService + ExplainabilityService | Atomic write bắt buộc (mục 2 #1) — đây là mitigation chính thức đã đề xuất từ Round 2/3, nay gắn đúng Service |
| **GAP-05** (Round 3) | `roadmap_node_knowledge_node` thiếu cột lý do | RoadmapMappingService | Atomic write với `ApprovalRecord` (mục 2 #4); cột `dependency_reason` vẫn là quyết định Database riêng (chưa chốt) |
| **GAP-06** (Round 3) | Recommendation thiếu nguồn self-assessment mismatch | RecommendationService ← DiscoveryService | DiscoveryService phải tồn tại và emit `SelfAssessmentMismatchDetected` trước khi RecommendationService có đủ input — đã đóng về mặt thiết kế Service, chưa đóng về mặt cơ chế Discovery cụ thể (Open Question #5) |
| **GAP-07** (Round 3) | Không có 1 lớp enforcement tập trung cho mọi cặp (decision + reason) | **ExplainabilityService** | Chính là câu trả lời cho GAP-07 — tập trung toàn bộ việc ghi `TraceLink` vào 1 Service duy nhất, không cho phép Service nghiệp vụ tự ghi `TraceLink` rời rạc |
| **Header/TraceLink Sync Risk** (Round 4.4) | Không có gì bắt buộc Header và Detail/TraceLink luôn được tạo cùng nhau | **DecisionPersistenceService**, gọi trong cùng transaction với Service sở hữu Detail | Atomic write bắt buộc (mục 2 #7) |
| **Mode Selection input verification** (Round 4.1-4.3) | Điều kiện Runtime Reconstruction cho D8 (input phải truy xuất được từ domain khác) chưa xác minh | MentorInteractionService | Khi thiết kế cụ thể Mode Selection logic, **chỉ được dùng input đã persist ở domain khác** (Evidence/AssessmentResult) — đây là 1 ràng buộc thiết kế cho chính Service này, không phải gap chờ Service khác đóng |
| **MentorSession Persistence Pattern chưa tường minh** (Round 4.2) | `MentorSession` chưa xuất hiện trong Domain Persistence Matrix | MentorInteractionService | Không phải vấn đề Service — cần bổ sung 1 dòng cho Mentor Interaction Domain vào `PersistenceArchitecture.md` (ngoài phạm vi Round này) |

**Kết quả:** 9/11 "Application Layer Discipline" dependency đã biết trước có 1 Service cụ thể chịu trách nhiệm rõ ràng. 2 còn lại (GAP-02, GAP-06) phụ thuộc thêm vào quyết định/cơ chế Database hoặc Domain chưa chốt (Open Question #21, #5) — Service đã được xác định, chỉ chờ cơ chế cụ thể.

---

## 5. Failure Mode Summary (tổng hợp ngắn, chi tiết đầy đủ ở APPLICATION_ORCHESTRATION_REVIEW.md)

| Loại lỗi xuyên Service | Hệ quả nếu không xử lý | Service chịu trách nhiệm retry/compensate |
|---|---|---|
| Atomic write (mục 2) thất bại giữa chừng (DB rollback toàn bộ) | An toàn — Postgres transaction rollback tự nhiên đảm bảo không có "decision record mồ côi" | Không cần compensate — rollback là đủ, miễn Service implement đúng "1 transaction" |
| Event consumer (mục 3, Eventual) không xử lý được event (vd: RecommendationService down khi `KnowledgeRegressionDetected` phát ra) | Đề xuất bị trễ, không sai dữ liệu — Recommendation là Proposal-Only, trễ không gây mất toàn vẹn | RecommendationService cần retry/dead-letter queue khi resume — không ảnh hưởng Service khác |
| ExplainabilityService/DecisionPersistenceService bị gọi nhưng lỗi (không phải do logic nghiệp vụ) | Nếu **trong cùng transaction** với Service gọi → toàn bộ rollback (an toàn, nhưng decision nghiệp vụ "biến mất", Learner phải thử lại). Nếu **ngoài transaction** (sai thiết kế) → đúng kiểu Sync Risk đã cảnh báo (Header/TraceLink desync) | Service gọi (Assessment/Recommendation/...) — đây là lý do mục 2 yêu cầu tường minh "cùng transaction", không phải gợi ý |

## Liên kết ngược

[APPLICATION_SERVICES_ARCHITECTURE.md](APPLICATION_SERVICES_ARCHITECTURE.md), [APPLICATION_ORCHESTRATION_REVIEW.md](APPLICATION_ORCHESTRATION_REVIEW.md), [EXPLAINABILITY_GAP_ANALYSIS.md](EXPLAINABILITY_GAP_ANALYSIS.md), [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md), [ARCHITECTURE_CONSOLIDATION_REPORT.md](ARCHITECTURE_CONSOLIDATION_REPORT.md).
