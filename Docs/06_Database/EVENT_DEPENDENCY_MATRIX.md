# Event Dependency Matrix — AI Mentor OS

> Phạm vi: phân tích kiến trúc. Không SQL/API/UI, không entity mới, không chốt quyết định. Ma trận Event → Producer → Consumers → Sync/Async → Criticality → Failure Impact, cộng với phát hiện Fan-out/Bottleneck/High-risk/No-consumer/No-producer.

---

## 1. Ma trận đầy đủ

| Event | Producer | Consumers | Sync/Async | Criticality | Failure Impact |
|---|---|---|---|---|---|
| `GoalDefined` | Goal & Roadmap | AssessmentService, LearningSessionOrchestrationService | Async | Trung bình | Trễ tạo `LearningSession` mới — không mất dữ liệu, chỉ trễ |
| `GoalArchived` | Goal & Roadmap | AssessmentService, LearningSessionOrchestrationService | Async | Trung bình | Tương tự trên |
| `RoadmapNodeProposed` | Goal & Roadmap | — | Async | Thấp | Không consumer bắt buộc — an toàn |
| `RoadmapNodeApproved`/`Rejected` | Goal & Roadmap | KnowledgeExpansionService | Async | Trung bình | Trễ Expansion — Learner có thể học tạm nội dung hiện có |
| `KnowledgeNodeExpanded` (Local) | KnowledgeExpansionService | RoadmapMappingService | Async | Thấp (Criticality C, Round 3.8) | Trễ cập nhật Roadmap mapping — thấp |
| `KnowledgeNodeExpanded` (Deep/Structural) | KnowledgeExpansionService | RoadmapMappingService, MentorInteractionService | Async | **Cao** (Criticality A, ảnh hưởng Knowledge Graph dùng chung) | Nếu MentorInteractionService không nhận được, Learner không thấy `expansion_reason` đúng lúc — vi phạm yêu cầu hiển thị (DECISION-023) tạm thời |
| `EvidenceRecorded` | MentorInteractionService | AssessmentService | Async | **Cao** | Trễ đánh giá — Mastery không cập nhật, nhưng Evidence vẫn an toàn (immutable), không mất dữ liệu |
| `AssessmentResultCreated` | AssessmentService | RecommendationService, DiscoveryService, Learning Profile (đọc) | Async | **Cao nhất** (fan-out lớn nhất, xem mục 2) | Trễ → Recommendation/Discovery hoạt động trên thông tin cũ; không mất dữ liệu nghiệp vụ |
| `KnowledgeRegressionDetected` | AssessmentService | RecommendationService | Async | Cao | Trễ đề xuất ôn tập — ảnh hưởng trải nghiệm, không ảnh hưởng toàn vẹn dữ liệu |
| `MasteryLevelAchieved`/`TeachScoreUpdated` | AssessmentService | (Learning Profile, đọc trực tiếp) | Async | Thấp | Không ảnh hưởng — Learning Profile tính lại theo yêu cầu |
| `SelfAssessmentMismatchDetected` | DiscoveryService | AssessmentService, RecommendationService | Async | Trung bình-Cao (đầu vào của GAP-06) | Mất tín hiệu này → Recommendation hoạt động thiếu 1/4 input (đã biết trước, GAP-06) |
| `MentorSessionModeChanged` | MentorInteractionService | — | Async (không consumer) | Thấp (Criticality C) | Không ảnh hưởng hệ thống khác — chỉ ảnh hưởng UI hiển thị Mode hiện tại |
| `RecommendationProposed` | RecommendationService | MentorInteractionService/TeachingService, LearningSessionOrchestrationService | Async | **Cao** (đặc biệt subtype "pause" — ảnh hưởng an toàn vận hành Learner) | Mất event "pause" → Learner không được đề xuất nghỉ đúng lúc — rủi ro trải nghiệm, không rủi ro toàn vẹn dữ liệu |
| `LearningSessionStarted`/`Paused`/`Resumed`/`Completed` | LearningSessionOrchestrationService | RecommendationService, Goal & Roadmap | Async | Trung bình | Trễ đồng bộ trạng thái — Learning Session tự thân vẫn nhất quán (nguồn sự thật là chính nó) |
| `LearningSessionArchived` | LearningSessionOrchestrationService | Goal & Roadmap, RecommendationService | Async | Trung bình | Tương tự trên |
| `SubSessionStarted`/`SubSessionEnded` | LearningSessionOrchestrationService | MentorInteractionService, TeachingService | Async | Trung bình | Trễ khởi tạo ngữ cảnh dạy-học — ảnh hưởng trải nghiệm trực tiếp (Learner phải chờ) |
| `DecisionRegistered` *(tuỳ chọn)* | DecisionPersistenceService | — | **Không áp dụng — không nên là Event tiêu thụ async, xem EVENT_CATALOG.md mục 2** | N/A | N/A |
| `TraceLinkCreated` *(tuỳ chọn)* | ExplainabilityService | — | **Không áp dụng — cùng lý do trên** | N/A | N/A |

---

## 2. Fan-out Events

| Event | Số Consumer | Nhận xét |
|---|---|---|
| **`AssessmentResultCreated`** | 3 (RecommendationService, DiscoveryService, Learning Profile) | **Fan-out lớn nhất trong toàn hệ thống** — bất kỳ thay đổi payload/timing của event này ảnh hưởng đồng thời 3 luồng khác nhau |
| `RecommendationProposed` | 2-3 (tuỳ subtype: MentorInteraction/Teaching cho "review", LearningSession cho "pause") | Fan-out có điều kiện (rẽ nhánh theo subtype, không phải broadcast tới tất cả) |
| `KnowledgeNodeExpanded` (Deep/Structural) | 2 (RoadmapMapping, MentorInteraction) | Fan-out trung bình |
| `SelfAssessmentMismatchDetected` | 2 (Assessment, RecommendationService) | Fan-out trung bình |

---

## 3. Bottleneck Events

1. **`AssessmentResultCreated`** — không chỉ fan-out lớn nhất, còn là **điểm duy nhất** mà 3 luồng khác nhau (Recommendation, Discovery, Learning Profile) phụ thuộc để biết "Mastery vừa đổi". Nếu AssessmentService chậm/nghẽn, cả 3 consumer đều bị ảnh hưởng đồng thời — đúng định nghĩa bottleneck (1 điểm, nhiều phụ thuộc).
2. **`EvidenceRecorded`** — là **điểm vào duy nhất** của toàn bộ pipeline Assessment→Recommendation (Flow 1 trong Orchestration Design) — mọi tắc nghẽn ở đây chặn toàn bộ chuỗi phía sau.

---

## 4. High-Risk Events

| Event | Vì sao High-Risk |
|---|---|
| `RecommendationProposed` (subtype "pause") | Liên quan trực tiếp tới an toàn vận hành của Learner (Adaptive Pause, DECISION-033) — mất/trễ event này có hậu quả trải nghiệm nghiêm trọng hơn các subtype khác, dù về mặt kỹ thuật cùng 1 Event Name |
| `KnowledgeNodeExpanded` (Deep/Structural) | Ảnh hưởng Knowledge Graph **dùng chung** (mọi Learner, không riêng 1 Learner) — sai sót ở đây lan rộng hơn bất kỳ event nào khác |
| `EvidenceRecorded` | Là input duy nhất cho Assessment — mất event này (không phải mất dữ liệu Evidence, mà mất *thông báo* rằng Evidence đã tồn tại) có thể làm Mastery "đứng yên" vô thời hạn nếu không có cơ chế dò quét bù (reconciliation) |

---

## 5. Events With No Consumer

| Event | Ghi chú |
|---|---|
| `RoadmapNodeProposed` | Không có consumer bắt buộc theo Domain Events List hiện tại — **chấp nhận được**, vì bản thân `ApprovalRecord` đã là nguồn sự thật cho luồng phê duyệt, event này chỉ mang tính thông báo |
| `MentorSessionModeChanged` | Không có consumer bắt buộc — **chấp nhận được theo đúng thiết kế** (D8, Criticality C, Round 3.8) — không phải lỗi, là kết quả của 1 quyết định đã có lý do rõ |

**Không có event "không consumer" nào là dấu hiệu lỗi thiết kế** — cả 2 trường hợp trên đã có lý do kiến trúc xác nhận từ trước, không phát sinh mới ở Round này.

---

## 6. Consumers With No Producer

> Đây là phần quan trọng nhất của ma trận — đối chiếu lại với 4 trigger nghi vấn từ Round Orchestration trước.

| "Consumer" cần input | Producer tương ứng hiện có? |
|---|---|
| `KnowledgeExpansionService` cần biết "có gap kiến thức" | **KHÔNG** — không có Producer/Event nào tên `KnowledgeGapDetected` |
| `RecommendationService` cần biết "có dependency gap" | **KHÔNG** — không phải dạng Event (xem [EVENT_CATALOG.md](EVENT_CATALOG.md) mục 4) |
| `RecommendationService`/`LearningSessionOrchestrationService` cần biết "Learner nên pause vì Stuck" | **KHÔNG** — chặn bởi Stuck Detection (D9a) chưa tồn tại |
| `MentorInteractionService` cần biết "nên đổi Mode" | **KHÔNG** — chặn bởi cơ chế Mode Selection input chưa đặc tả |

**4/4 "Consumer không có Producer" đã được xác nhận lại ở Round này, khớp hoàn toàn với phát hiện của Round Orchestration trước — không có "Consumer không Producer" nào mới phát sinh ngoài 4 cái đã biết.**

## Liên kết ngược

[EVENT_CATALOG.md](EVENT_CATALOG.md), [EVENT_LIFECYCLE_REVIEW.md](EVENT_LIFECYCLE_REVIEW.md), [APPLICATION_FLOW_SEQUENCE_MATRIX.md](APPLICATION_FLOW_SEQUENCE_MATRIX.md), [APPLICATION_ORCHESTRATION_REVIEW.md](APPLICATION_ORCHESTRATION_REVIEW.md).
