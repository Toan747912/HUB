# Event Catalog — AI Mentor OS

> Phạm vi: phân tích kiến trúc Event. **Không thiết kế SQL/API/UI, không tạo entity mới trừ khi tuyệt đối cần và giải thích rõ, không chốt quyết định.** Tổng hợp toàn bộ vocabulary Event đã có (Domain Events List, [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 4) + Event/tín hiệu phát sinh từ [APPLICATION_ORCHESTRATION_DESIGN.md](APPLICATION_ORCHESTRATION_DESIGN.md)/[APPLICATION_FLOW_SEQUENCE_MATRIX.md](APPLICATION_FLOW_SEQUENCE_MATRIX.md).

---

## 0. Phân loại Event Type (định nghĩa dùng xuyên tài liệu)

| Loại | Định nghĩa | Ví dụ |
|---|---|---|
| **Domain Event** | Phản ánh 1 thay đổi state có ý nghĩa nghiệp vụ, sinh ra từ đúng 1 Core Domain đã chốt write-ownership (CoreDomainMap mục 5) | `AssessmentResultCreated`, `GoalDefined` |
| **Application Event** | Sinh ra từ tầng Application Service điều phối (không phải Domain Aggregate tự thân thay đổi state nghiệp vụ) — phục vụ cross-service awareness, không bắt buộc tồn tại để hệ thống đúng | `DecisionRegistered` (tuỳ chọn, DecisionPersistenceService) |
| **System Event** | Sự kiện vận hành/observability, không mang ý nghĩa nghiệp vụ | `ConsumerLagAlert`, `DeadLetterQueued` (minh hoạ khái niệm, không thiết kế chi tiết — ngoài phạm vi Database/Domain Architecture) |

---

## 1. Domain Events (16, đã khoá ở CoreDomainMap.md mục 4 — không đổi nội dung, chỉ bổ sung cột phân tích)

| Event Name | Producer | Consumers | Trigger Condition | Payload (khái niệm) | Persistence Requirement | Explainability Requirement |
|---|---|---|---|---|---|---|
| `GoalDefined` | Goal & Roadmap (RoadmapMappingService) | AssessmentService, LearningSessionOrchestrationService | Learner xác lập Goal mới | `goal_id`, `learner_id`, timestamp | Không cần persist riêng — `Goal` tự thân đã immutable/append-only (DECISION-032) | Thấp — Goal là phát biểu trực tiếp Learner, không phải suy luận AI |
| `GoalArchived` | Goal & Roadmap | AssessmentService, LearningSessionOrchestrationService | Goal đổi giữa đường (DECISION-032) | `goal_id`, `superseded_by_goal_id` | Không cần persist riêng | Thấp |
| `RoadmapNodeProposed` | Goal & Roadmap | — | AI đề xuất cấu trúc Roadmap mới | `roadmap_node_id`, `approval_record_id` | Không cần persist riêng — `ApprovalRecord` là nguồn sự thật | Cao — cần lý do AI đề xuất (đã có qua `ApprovalRecord`) |
| `RoadmapNodeApproved` / `RoadmapNodeRejected` | Goal & Roadmap | KnowledgeExpansionService | Learner phê duyệt/từ chối qua Roadmap Governance | `roadmap_node_id`, `decision` | Không cần persist riêng | Trung bình — qua `ApprovalRecord` |
| `KnowledgeNodeExpanded` (Local) | KnowledgeExpansionService | RoadmapMappingService | Mở rộng nhỏ, không approval | `knowledge_node_id`, `new_edge_ids[]` | Không cần persist riêng (payload event), nhưng **nội dung lý do cần persist ở nơi khác — GAP-02, chưa có** | Bắt buộc, nội bộ — chưa có cơ chế (GAP-02) |
| `KnowledgeNodeExpanded` (Deep/Structural) | KnowledgeExpansionService | RoadmapMappingService, MentorInteractionService | Mở rộng lớn, có `ExpansionRecord` | `knowledge_node_id`, `expansion_record_id`, `new_edge_ids[]` | Không cần persist riêng — `ExpansionRecord` là nguồn sự thật | Bắt buộc, hiển thị Learner — đã có (`expansion_reason`) |
| `EvidenceRecorded` | MentorInteractionService (qua EvidenceCaptureService) | AssessmentService | Learner phản hồi trong `MentorSession` | `evidence_id`, `evidence_link_ids[]`, `knowledge_node_ids[]` | Không cần persist riêng — `Evidence`/`EvidenceLink` là nguồn sự thật, immutable | Là **nguồn** explainability cho Assessment, không tự cần giải thích |
| `AssessmentResultCreated` | AssessmentService | RecommendationService, DiscoveryService, (Learning Profile — đọc trực tiếp) | `AssessmentResult` mới được ghi | `assessment_result_id`, `knowledge_node_id`, `learner_id`, `verdict` | Không cần persist riêng — `AssessmentResult` là nguồn sự thật | Cao nhất hệ thống — đã có 8 trường + `TraceLink` |
| `KnowledgeRegressionDetected` | AssessmentService | RecommendationService | Evidence Weight cho thấy tụt mastery (DECISION-021) | `knowledge_node_id`, `learner_id`, `regression_severity` | Không cần persist riêng — suy ra từ `AssessmentResult` | Kế thừa từ `AssessmentResult` gây ra nó |
| `MasteryLevelAchieved` / `TeachScoreUpdated` | AssessmentService | (Learning Profile — đọc trực tiếp) | Mastery đạt mốc mới | `knowledge_node_id`, `learner_id`, `new_level` | Không cần persist riêng | Kế thừa từ `AssessmentResult` |
| `SelfAssessmentMismatchDetected` | DiscoveryService | AssessmentService, RecommendationService | So sánh self-assessment vs observed Evidence/Assessment cho ra sai lệch | `discovery_session_id`, `mismatch_id`, `knowledge_node_id` | Không cần persist riêng — `DiscoverySession`/`SelfAssessmentMismatch` là nguồn sự thật | **Mới theo DECISION-048** — Discovery phải tự explainable, không chỉ là điểm đến trace |
| `MentorSessionModeChanged` | MentorInteractionService | — (không consumer bắt buộc) | D8 — đổi Learning Mode | `mentor_session_id`, `old_mode`, `new_mode` | Không cần persist riêng — `MentorSession.mode` là current state | Qua **Runtime Reconstruction** (Round 4.1-4.2), không qua payload event |
| `RecommendationProposed` (mọi subtype, kể cả "pause") | RecommendationService | MentorInteractionService/TeachingService (review), LearningSessionOrchestrationService (pause) | Tổng hợp tín hiệu xong | `recommendation_proposal_id`, `subtype`, `traced_to[]` | Không cần persist riêng — `RecommendationProposal` là nguồn sự thật | Bắt buộc `traced_to[]`, không ngoại lệ (DECISION-027) |
| `LearningSessionStarted`/`Paused`/`Resumed`/`Completed` | LearningSessionOrchestrationService | RecommendationService (Completed), Goal & Roadmap (Started) | Vòng đời `LearningSession` | `learning_session_id`, `state`, `transition_source` | Không cần persist riêng — `learning_session_transition` (DECISION-047) là nguồn sự thật | Trung bình — transition log đã ghi nguồn gốc |
| `LearningSessionArchived` | LearningSessionOrchestrationService | Goal & Roadmap, RecommendationService | Goal đổi giữa đường (DECISION-032) | `learning_session_id`, `archived_reason` | Không cần persist riêng | Trung bình |
| `SubSessionStarted`/`SubSessionEnded` | LearningSessionOrchestrationService | MentorInteractionService, TeachingService | Bắt đầu/kết thúc phạm vi RoadmapNode/KnowledgeNode cụ thể | `sub_session_id`, `learning_session_id`, `roadmap_node_id` | Không cần persist riêng | Thấp |

---

## 2. Application Events (mới đặt tên ở Round này — tuỳ chọn, không bắt buộc tồn tại)

| Event Name | Producer | Consumers | Trigger Condition | Payload (khái niệm) | Persistence Requirement | Explainability Requirement |
|---|---|---|---|---|---|---|
| `DecisionRegistered` *(tuỳ chọn)* | DecisionPersistenceService | (Không bắt buộc — chỉ phục vụ analytics/observability nếu cần) | Decision Header được ghi (khi Shared Mechanism tồn tại) | `decision_type`, `capability`, `learner_id`, `header_id` | **Không nên persist** dưới dạng event log riêng — Decision Header chính nó đã là nguồn sự thật, event này (nếu có) chỉ là thông báo | N/A — bản thân là sản phẩm của explainability, không cần giải thích thêm |
| `TraceLinkCreated` *(tuỳ chọn, nội bộ)* | ExplainabilityService | (Không có consumer bắt buộc — nội bộ) | `TraceLink` row được ghi | `trace_link_id`, `source_type`, `target_type` | Không persist — `TraceLink` đã là nguồn sự thật | N/A |

**Quan trọng — đây là phát hiện chính của Task 5 (xem mục 5):** `DecisionRegistered` và `TraceLinkCreated` **không nên được mô hình hoá như Event tiêu thụ bất đồng bộ** — write vào Decision Header / `TraceLink` luôn phải là **lệnh gọi đồng bộ trong cùng transaction** với Service nghiệp vụ gọi nó (đã chốt ở Round Application Services, mục Boundary Matrix). 2 "event" này chỉ tồn tại ở đây để hoàn thiện vocabulary, **không phải đề xuất biến chúng thành cơ chế async** — nếu có tồn tại, chỉ nên là thông báo phụ *sau khi* transaction đã commit, không phải cơ chế ghi chính.

---

## 3. System Events (minh hoạ khái niệm, không thiết kế chi tiết — ngoài phạm vi Domain/Database Architecture)

| Event Name | Vai trò |
|---|---|
| `ConsumerLagAlert` | Báo hiệu 1 consumer (vd: AssessmentService) tụt lại so với tốc độ event được produce — vận hành, không nghiệp vụ |
| `DeadLetterQueued` | Báo hiệu 1 event không thể xử lý sau N lần retry — vận hành |

Không phân tích thêm — 2 event này thuộc Infrastructure/Observability, được liệt kê chỉ để vocabulary đầy đủ theo đúng 3 loại Event Type đã định nghĩa ở mục 0.

---

## 4. Candidate Events — chưa tồn tại, được phát hiện thiếu ở Round Orchestration trước (xem Task 4 chi tiết ở [EVENT_LIFECYCLE_REVIEW.md](EVENT_LIFECYCLE_REVIEW.md) mục Task 4)

> **Không tạo các Event này** — chỉ liệt kê làm ứng viên phân tích, theo đúng giới hạn "Do NOT create new entities unless absolutely required and explicitly justified" — Round này **không** đánh giá là "absolutely required" cho cả 4 (xem lý do chi tiết ở Task 4), nên không tạo.

| Tên ứng viên | Vì sao chưa tồn tại | Trạng thái |
|---|---|---|
| `KnowledgeGapDetected` | Không có event nào hiện tại đại diện đúng "RoadmapNode cần độ sâu KnowledgeNode chưa có" | Thiếu thật, có thể định nghĩa ngay (Task 4: A) |
| *(không đặt tên — xem lý do)* "Dependency Gap Signal" | Về bản chất là 1 **trạng thái cần truy vấn liên tục** (so sánh `roadmap_node_knowledge_node` vs `knowledge_node_mastery`), không phải 1 **sự việc xảy ra tại 1 thời điểm** | Không phải dạng thiếu Event — là sai phạm trù khi cố ép thành Event (Task 4: không phải A, không phải B — xem phân tích riêng) |
| `StuckDetected` (D9a) | Cơ chế Stuck Detection hoàn toàn chưa tồn tại (Open Question #6/#11) | Thiếu, nhưng **bị chặn bởi cơ chế chưa tồn tại**, không thể đặt tên Event có ý nghĩa cho tới khi cơ chế chốt (Task 4: A, blocked) |
| `MentorSessionModeChangeTriggered` | Nguồn tín hiệu quyết định đổi Mode (D8) chưa được đặc tả (Round 4.1-4.3 Remaining Risk) | Thiếu, nhưng **bị chặn bởi cơ chế chưa tồn tại** (Task 4: A, blocked) |

## Liên kết ngược

[EVENT_DEPENDENCY_MATRIX.md](EVENT_DEPENDENCY_MATRIX.md), [EVENT_LIFECYCLE_REVIEW.md](EVENT_LIFECYCLE_REVIEW.md), [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md), [APPLICATION_ORCHESTRATION_DESIGN.md](APPLICATION_ORCHESTRATION_DESIGN.md), [APPLICATION_FLOW_SEQUENCE_MATRIX.md](APPLICATION_FLOW_SEQUENCE_MATRIX.md).
