# Application Flow Sequence Matrix

> Dạng rút gọn của [APPLICATION_ORCHESTRATION_DESIGN.md](APPLICATION_ORCHESTRATION_DESIGN.md) — tra cứu nhanh hop-by-hop, transaction boundary, và đối chiếu Event Produced/Consumed xuyên 5 flow. Không SQL/API/UI, không entity mới, không chốt quyết định.

## 1. Service Hop Sequence (đọc theo thứ tự thời gian, mỗi `→` là 1 ranh giới async trừ khi ghi rõ "sync")

| Flow | Hop 1 | Hop 2 | Hop 3 | Hop 4 |
|---|---|---|---|---|
| **1. Assessment** | `MentorInteractionService` (ghi Evidence) | →(event)→ `AssessmentService` (ghi AssessmentResult+Mastery, sync-gọi ExplainabilityService) | →(event)→ `RecommendationService` (ghi Proposal, sync-gọi ExplainabilityService) | — |
| **2. Teaching** | `LearningSessionOrchestrationService` (start SubSession) | →(event)→ `TeachingService` (đọc 4 domain, chọn nội dung — **không ghi**) | →(sync)→ `MentorInteractionService` (trình bày) | — |
| **3. Knowledge Expansion** | (nguồn gap, không event chính thức) | → `KnowledgeExpansionService` (ghi Edge[+Record], sync-gọi ExplainabilityService nếu Deep/Structural) | →(event)→ `RoadmapMappingService` / `MentorInteractionService` | — |
| **4. Recommendation** | (1 trong 4 signal source) | → `RecommendationService` (tổng hợp, ghi Proposal, sync-gọi ExplainabilityService) | →(event)→ `LearningSessionOrchestrationService` (pause) hoặc `TeachingService` (review) | — |
| **5. Mentor Interaction** | (tín hiệu nội bộ, không event chính thức) | → `MentorInteractionService` (ghi Mode) | →(sync)→ trình bày Learner | — |

## 2. Transaction Boundary Quick Reference

| Flow | TB | Thành phần atomic | Service chủ trì |
|---|---|---|---|
| 1 | TB1 | `Evidence`+`EvidenceLink` | MentorInteractionService |
| 1 | TB2 | `AssessmentResult`+`KnowledgeNodeMastery`+`TraceLink` | AssessmentService → ExplainabilityService |
| 1 | TB3 | `RecommendationProposal`+`TraceLink` | RecommendationService → ExplainabilityService |
| 2 | TB1 | `SubSession` start | LearningSessionOrchestrationService |
| 2 | — | **Không có TB cho Content Selection** (GAP-01) | TeachingService |
| 3 | TB1-DS | `KnowledgeEdge`(s)+`ExpansionRecord`(+`TraceLink`) | KnowledgeExpansionService → ExplainabilityService |
| 3 | TB1-Local | `KnowledgeEdge` đơn lẻ — **không có companion để atomic cùng** (GAP-02) | KnowledgeExpansionService |
| 4 | TB1 | `RecommendationProposal`+`TraceLink` | RecommendationService → ExplainabilityService |
| 5 | TB1 | `MentorSession.mode` (đơn-row) | MentorInteractionService |

## 3. Event Produced/Consumed Cross-Reference (toàn bộ 5 flow)

| Event | Produced by (Flow) | Consumed by (Flow) | Có tên chính thức trong Domain Events List không? |
|---|---|---|---|
| `EvidenceRecorded` | MentorInteractionService (F1) | AssessmentService (F1) | ✅ Có |
| `AssessmentResultCreated` | AssessmentService (F1) | RecommendationService (F1, F4) | ✅ Có |
| `KnowledgeRegressionDetected` | AssessmentService (F1) | RecommendationService (F1, F4) | ✅ Có |
| `RecommendationProposed` | RecommendationService (F1, F4) | LearningSessionOrchestrationService / TeachingService (F4) | ✅ Có |
| `SubSessionStarted` | LearningSessionOrchestrationService (F2) | TeachingService, MentorInteractionService (F2) | ✅ Có |
| `KnowledgeNodeExpanded` | KnowledgeExpansionService (F3) | RoadmapMappingService, MentorInteractionService (F3) | ✅ Có |
| `SelfAssessmentMismatchDetected` | DiscoveryService (ngoài 5 flow, input cho F4) | RecommendationService (F4) | ✅ Có |
| `MentorSessionModeChanged` | MentorInteractionService (F5) | — (không có consumer bắt buộc) | ✅ Có |
| **"Knowledge Gap Detected"** | (ngụ ý, F3 Trigger) | KnowledgeExpansionService (F3) | ❌ **Không có tên chính thức** — phát hiện mới |
| **"Dependency Gap Signal"** | (ngụ ý, F4 Trigger) | RecommendationService (F4) | ❌ **Không có tên chính thức — là truy vấn, không phải event** |
| **"Pause-Eligible Signal"** | (ngụ ý, F4 Trigger, liên quan D9a) | RecommendationService (F4) | ❌ **Không có tên chính thức — phụ thuộc Stuck Detection chưa tồn tại** |
| **"Mode-Change Trigger Signal"** | (ngụ ý, F5 Trigger) | MentorInteractionService (F5) | ❌ **Không có tên chính thức** — input source D8 chưa chốt |

**4/12 sự kiện/tín hiệu được dùng làm Trigger trong 5 flow không có tên chính thức trong Domain Events List** ([CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 4) — đây không phải lỗi của flow design, là phản ánh đúng thực tế: cả 3 cơ chế đứng sau (Knowledge Gap Detection, Stuck Detection D9a, Mode Selection D8 input) đều chưa được Domain Architecture đặc tả tới mức đủ chi tiết để có tên event.

## 4. Atomic vs Eventually Consistent — Toàn cảnh 5 Flow

| Atomic (Strong, trong 1 transaction) | Eventually Consistent (qua event/đọc async) |
|---|---|
| Evidence+EvidenceLink (F1) | Evidence→Assessment hop (F1) |
| AssessmentResult+Mastery+TraceLink (F1) | Assessment→Recommendation hop (F1, F4) |
| RecommendationProposal+TraceLink (F1, F4) | TeachingService đọc Mastery/Roadmap/Recommendation (F2) |
| SubSession start/transition (F2) | KnowledgeExpansion→RoadmapMapping/MentorInteraction hop (F3) |
| KnowledgeEdge+ExpansionRecord(+TraceLink), Deep/Structural (F3) | Signal consumption đầu vào của Recommendation (F4) |
| MentorSession.mode update (F5) | Presentation/delivery cho Learner (F2, F5) |

## Liên kết ngược

[APPLICATION_ORCHESTRATION_DESIGN.md](APPLICATION_ORCHESTRATION_DESIGN.md), [APPLICATION_ORCHESTRATION_REVIEW.md](APPLICATION_ORCHESTRATION_REVIEW.md).
