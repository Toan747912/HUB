# Command/Query Architecture — AI Mentor OS

> Phạm vi: phân tích kiến trúc Command/Query. **Không thiết kế endpoint/payload, không viết SQL.** Kế thừa trực tiếp [APPLICATION_SERVICE_BOUNDARY_MATRIX.md](../06_Database/APPLICATION_SERVICE_BOUNDARY_MATRIX.md) mục 2/3 (transaction boundary, eventual consistency đã chốt ở Round Application Services) — tài liệu này tổ chức lại đúng nội dung đó dưới góc nhìn Command/Query/Read Model, không phát sinh quy tắc consistency mới nào ngoài những gì đã có.

---

## 0. Nguyên tắc CQS dùng trong tài liệu này

- **Command** = thay đổi state, không trả Read Model đầy đủ (chỉ trả ack/id) — mọi Command map 1-1 vào 1 hàng trong [APPLICATION_SERVICE_BOUNDARY_MATRIX.md](../06_Database/APPLICATION_SERVICE_BOUNDARY_MATRIX.md) mục 2 (Atomic) hoặc mục 3 (Eventual, cho phần input).
- **Query** = chỉ đọc, không thay đổi state, idempotent tuyệt đối — không có Query nào trong tài liệu này được phép có side-effect (kể cả ghi log/cache không gây thay đổi nghiệp vụ là chấp nhận được, nhưng không nằm trong phạm vi Command/Query Architecture).
- **State Change** = Aggregate/bảng bị ảnh hưởng bởi 1 Command, đúng write-ownership CoreDomainMap mục 5.
- **Consistency Expectation** = Strong (đồng bộ, atomic, trong 1 transaction) hoặc Eventual (chấp nhận trễ, qua event) — dùng đúng 2 giá trị đã được Boundary Matrix xác lập, không thêm giá trị thứ 3.

---

## 1. Identity

| Command | State Change | Consistency |
|---|---|---|
| `AnonymizeLearner` | `learner` → trạng thái Anonymized | Strong — phải hoàn tất trước khi cho phép gọi Supabase Auth Delete (DECISION-037/043) |

| Query | Read Model | Consistency |
|---|---|---|
| `GetLearnerProfile` | `learner` (current state) | Strong (đọc trực tiếp current state, không qua cache trễ) |

---

## 2. Goal & Roadmap

| Command | State Change | Consistency |
|---|---|---|
| `DefineGoal` | `goal` mới (append, immutable — DECISION-032) | Strong |
| `ArchiveGoalAndSupersede` | `goal.superseded_by` + tạo `learning_session` mới + archive cũ | Strong — phải atomic với Learning Session archive (DECISION-032), 2 Aggregate khác Service nhưng cùng yêu cầu nghiệp vụ "đổi Goal giữa đường" |
| `ApproveRoadmapNode` / `RejectRoadmapNode` | `roadmap_node` + `approval_record` | Strong, atomic (GAP-05 — cần kèm lý do dependency, hiện thiếu) |
| `MapKnowledgeNodeToRoadmapNode` (D6) | `roadmap_node_knowledge_node` + `approval_record` (nếu Governance áp dụng) | Strong, atomic — Boundary Matrix mục 2 #4 |

| Query | Read Model | Consistency |
|---|---|---|
| `GetActiveRoadmap` | `roadmap`, `roadmap_node` | Strong |
| `GetRoadmapProgress` | Projection tổng hợp `roadmap_node` × `knowledge_node_mastery` | Eventual — Mastery có thể vài giây/phút cũ, không ảnh hưởng nghiêm trọng |

---

## 3. Learning Session

| Command | State Change | Consistency |
|---|---|---|
| `StartLearningSession` / `PauseLearningSession` / `ResumeLearningSession` / `CompleteLearningSession` / `ArchiveLearningSession` | `learning_session` + `learning_session_transition` | Strong, atomic — DECISION-047 |
| `ConfirmPauseRecommendation` | `learning_session` (Pause) + `learning_session_transition` | Strong — Learner phải confirm tường minh, không tự động (DECISION-033) |
| `StartSubSession` / `EndSubSession` | `sub_session` | Strong |

| Query | Read Model | Consistency |
|---|---|---|
| `GetCurrentSession` | `learning_session`, `sub_session` (current state) | Strong |
| `GetSessionHistory` | `learning_session_transition` | Strong (append-only, không có khái niệm "trễ" cho dữ liệu lịch sử) |

---

## 4. Mentor Interaction

| Command | State Change | Consistency |
|---|---|---|
| `SubmitLearnerResponse` | `evidence` + `evidence_link` (qua EvidenceCaptureService) | Strong (ghi Evidence) — nhưng **Eventual cho việc Assessment xử lý sau đó** (Boundary Matrix mục 3 #1) |
| *(không có Command "ChangeMode" — D8 không phải lệnh Learner gọi, là quyết định nội tại tự kích hoạt của Mentor Interaction Domain)* | `mentor_session.mode` | Strong — atomic tự thân (1 row), Criticality C |

| Query | Read Model | Consistency |
|---|---|---|
| `GetCurrentMentorSession` | `mentor_session` (gồm Mode hiện tại) | Strong |
| `GetEvidenceHistory` | `evidence`, `evidence_link` | Strong (append-only, immutable) |

---

## 5. Assessment

> **Không có Command Public nào** — `AssessmentResult` không bao giờ là input trực tiếp từ Learner/Frontend, luôn là hệ quả nội bộ của `EvidenceRecorded`.

| Internal Command (Service-to-Service) | State Change | Consistency |
|---|---|---|
| `EvaluateEvidence` (trigger nội bộ khi consume `EvidenceRecorded`) | `assessment_result` + `knowledge_node_mastery` + `trace_link` | **Strong** — atomic trong 1 transaction (GAP-04, Boundary Matrix mục 2 #1); nhưng **Eventual** ở điểm trigger (Evidence → Assessment qua event, không cùng transaction với việc tạo Evidence) |

| Query | Read Model | Consistency |
|---|---|---|
| `GetAssessmentResults` | `assessment_result` | Strong |
| `GetCurrentMastery` | `knowledge_node_mastery` | Strong |

---

## 6. Knowledge Graph

| Command | State Change | Consistency |
|---|---|---|
| *(không có Command Public — Expansion luôn tự phát từ tín hiệu nội bộ, không phải lệnh Learner)* | — | — |
| Internal: `ExpandKnowledgeDeepStructural` (D4) | `knowledge_edge` + `expansion_record` | Strong, atomic (Boundary Matrix mục 2 #3, GAP-03) |
| Internal: `ExpandKnowledgeLocal` (D5) | `knowledge_edge` + (pending) log lý do nội bộ | Strong khi mechanism tồn tại — hiện **chưa atomic được vì chưa có nơi ghi lý do** (GAP-02, chặn) |

| Query | Read Model | Consistency |
|---|---|---|
| `GetKnowledgeGraphContext` (theo RoadmapNode đang học) | `knowledge_node`, `knowledge_edge` (qua Recursive CTE) | Strong |
| `GetExpansionReason` (Deep/Structural, hiển thị Learner) | `expansion_record` | Strong |

---

## 7. Recommendation

> **Không có Command nào tạo Recommendation theo yêu cầu** (DECISION-019) — chỉ có Internal Command tự phát từ signal.

| Internal Command | State Change | Consistency |
|---|---|---|
| `SynthesizeRecommendation` (trigger nội bộ từ `KnowledgeRegressionDetected`/`SelfAssessmentMismatchDetected`/dependency-gap/pause-eligible) | `recommendation_proposal` + `trace_link` (`traced_to[]`) | **Strong cho việc ghi proposal** (atomic với TraceLink, không ngoại lệ — DECISION-027); **Eventual cho tín hiệu đầu vào** (Boundary Matrix mục 1, dòng RecommendationService) |

| Query | Read Model | Consistency |
|---|---|---|
| `GetActiveRecommendations` | `recommendation_proposal` | Strong (đọc trực tiếp, dù input có thể trễ) |

---

## 8. Teaching (Capability điều phối, không Domain — không ghi Aggregate nghiệp vụ)

> **Không có Command nào ghi Aggregate nghiệp vụ** — TeachingService chỉ chọn, không sở hữu state để thay đổi (Boundary Matrix mục 1: "Không ghi Aggregate nghiệp vụ nào").

| Internal Command | State Change | Consistency |
|---|---|---|
| `SelectNextContent` (D1) | (pending) Decision Header | Eventual khi đọc input (mastery/roadmap/recommendation snapshot vài giây/phút cũ là chấp nhận được), **Strong khi ghi Header** (khi mechanism tồn tại) |
| `SelectInterventionTier` (D9b) | (pending) Decision Header | Cùng tính chất D1 |

| Query | Read Model | Consistency |
|---|---|---|
| `GetSelectedContent` | Projection (không phải 1 bảng, tổng hợp từ Knowledge/Roadmap/Assessment/Recommendation) | Eventual |

---

## 9. Discovery

| Command | State Change | Consistency |
|---|---|---|
| `SubmitSelfAssessment` | `discovery_session` | Strong |
| Internal: `DetectMismatch` (D7) | `self_assessment_mismatch` + `trace_link` (tự-trace) | Strong, atomic (Boundary Matrix mục 2 #6, mới theo DECISION-048) |

| Query | Read Model | Consistency |
|---|---|---|
| `GetDiscoverySessions` | `discovery_session`, `self_assessment_mismatch` | Strong (ghi); so sánh với Assessment history là **Eventual** (Boundary Matrix mục 3 #5) |

---

## 10. Cross-cutting (Explainability, Decision Persistence) — Không có Command/Query Public

| Internal Command | State Change | Consistency |
|---|---|---|
| `WriteTraceLink` (gọi nội bộ trong transaction Service khác) | `trace_link` | Strong — luôn cùng transaction với Service gọi (không ngoại lệ) |
| `RegisterDecision` (gọi nội bộ, mechanism pending) | Decision Header | Strong — luôn cùng transaction với Detail (nếu có) |

Không có Query Public nào cho 2 cơ chế này — mọi nhu cầu đọc "vì sao" đi qua Read Model của Service sở hữu Detail (đã JOIN `trace_link` sẵn).

---

## 11. Tổng hợp Strong vs Eventual Consistency (trả lời Mandatory Question liên quan)

### 11.1 Strong Consistency bắt buộc

| # | Cặp ghi | Lý do |
|---|---|---|
| 1 | `AssessmentResult` + `KnowledgeNodeMastery` + `TraceLink` | GAP-04, DECISION-026/030/038 |
| 2 | `RecommendationProposal` + `TraceLink` | DECISION-027, không ngoại lệ |
| 3 | `KnowledgeEdge` + `ExpansionRecord` (Deep/Structural) | GAP-03 |
| 4 | `roadmap_node_knowledge_node` + `ApprovalRecord` | GAP-05 |
| 5 | `LearningSession`/`SubSession` + `learning_session_transition` | DECISION-047 |
| 6 | `DiscoverySession`/`SelfAssessmentMismatch` + `TraceLink` | DECISION-048 (D7 tự-trace) |
| 7 | Decision Header + Detail (khi Detail tồn tại) | Header/TraceLink Sync Risk |
| 8 | `MentorSession.mode` update | Atomic tự thân, 1 row |

### 11.2 Eventual Consistency chấp nhận được

| # | Luồng | Lý do |
|---|---|---|
| 1 | `EvidenceRecorded` → AssessmentService | Assessment là consumer qua Domain Event, không cùng transaction với tạo Evidence |
| 2 | `AssessmentResultCreated`/`KnowledgeRegressionDetected` → RecommendationService | Recommendation luôn Proposal-Only, không cần xuất hiện ngay |
| 3 | TeachingService đọc Mastery/Roadmap/Recommendation | Snapshot vài giây/phút cũ không gây hậu quả nghiêm trọng |
| 4 | `LearningProfile`/Memory Profile (Projection) | DECISION-036 — không có write path riêng |
| 5 | DiscoveryService so sánh self-assessment vs AssessmentResult lịch sử | Không cần real-time |
| 6 | `KnowledgeNodeExpanded` → RoadmapMappingService đọc lại | Gắn KnowledgeNode mới vào Roadmap là quyết định riêng (D6), xảy ra sau |

**Không có cặp ghi nào nằm ở vùng xám giữa Strong/Eventual** — mọi trường hợp đã được phân loại dứt khoát ở Round Application Services trước đây; tài liệu này không phát sinh phân loại mới.

---

## Liên kết ngược

[API_BOUNDARY_ANALYSIS.md](API_BOUNDARY_ANALYSIS.md), [FRONTEND_BACKEND_INTERACTION_REVIEW.md](FRONTEND_BACKEND_INTERACTION_REVIEW.md), [AI_SERVICE_API_REVIEW.md](AI_SERVICE_API_REVIEW.md), [APPLICATION_SERVICE_BOUNDARY_MATRIX.md](../06_Database/APPLICATION_SERVICE_BOUNDARY_MATRIX.md), [APPLICATION_ORCHESTRATION_REVIEW.md](../06_Database/APPLICATION_ORCHESTRATION_REVIEW.md).
