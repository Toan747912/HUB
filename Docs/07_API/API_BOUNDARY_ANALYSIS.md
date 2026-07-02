# API Boundary Analysis — AI Mentor OS

> Phạm vi: **phân tích kiến trúc API boundary only.** Không thiết kế endpoint, không viết OpenAPI spec, không viết controller, không viết SQL. Kế thừa trực tiếp [APPLICATION_SERVICES_ARCHITECTURE.md](../06_Database/APPLICATION_SERVICES_ARCHITECTURE.md) (9 Service bắt buộc + 3 Service bổ sung), [APPLICATION_SERVICE_BOUNDARY_MATRIX.md](../06_Database/APPLICATION_SERVICE_BOUNDARY_MATRIX.md), [AI_DECISION_TAXONOMY.md](../06_Database/AI_DECISION_TAXONOMY.md), [SupabaseCompatibilityReview.md](../06_Database/SupabaseCompatibilityReview.md), [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md). Không tạo Service/Domain mới — mọi dòng dưới đây map 1-1 vào Service đã có.

---

## 0. Định nghĩa dùng trong tài liệu này

| Thuật ngữ | Định nghĩa |
|---|---|
| **Public API** | API mà `Apps/frontend`/`Apps/admin` được phép gọi trực tiếp (qua Backend hoặc qua Supabase, tuỳ kết luận ở [FRONTEND_BACKEND_INTERACTION_REVIEW.md](FRONTEND_BACKEND_INTERACTION_REVIEW.md)) |
| **Internal API** | API chỉ gọi được giữa Service ↔ Service trong `Apps/backend`/`Apps/ai-service`, không lộ ra Frontend dưới bất kỳ hình thức nào |
| **AI-Internal-Only** | 1 dạng đặc biệt của Internal API — chỉ tồn tại để 1 AI Capability gọi tới hạ tầng cross-cutting (Explainability/DecisionPersistence); không phải nghiệp vụ Learner-facing, không bao giờ có lý do để lộ ra Public |
| **Read Model** | Dữ liệu mà API trả về khi đọc — có thể là Aggregate hiện tại (Current State) hoặc Projection |
| **Write Model** | Aggregate/bảng mà API ghi vào, đúng write-ownership đã chốt ở [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 5 |

---

## 1. Ma trận Domain/Capability × API Boundary

### 1.1 Identity

| Thuộc tính | Giá trị |
|---|---|
| **Service Owner** | AccountLifecycleService |
| **Public API** | Có — đăng ký/đăng nhập đi qua Supabase Auth trực tiếp (ngoài phạm vi Backend tự viết); "xoá tài khoản" (Right-to-be-Forgotten) là Public API **bắt buộc đi qua Backend**, không gọi trực tiếp Supabase Auth Delete API từ Frontend |
| **Internal API** | Quy trình Anonymization (`learner` → trạng thái Anonymized) trước khi cho phép xoá `auth.users` (DECISION-037, DECISION-043 Consequences #3) |
| **Consumer** | Frontend (đăng ký/đăng nhập qua Supabase Auth SDK; yêu cầu xoá tài khoản qua Backend) |
| **Read Model** | `learner` (current state) |
| **Write Model** | `learner` (Anonymization), không bao giờ `auth.users` trực tiếp từ Backend tự viết (Supabase Auth tự quản lý) |
| **Never Public** | Cascade delete trực tiếp `auth.users` — phải luôn đi qua workflow Anonymization của Backend |

### 1.2 Goal & Roadmap (RoadmapMappingService)

| Thuộc tính | Giá trị |
|---|---|
| **Service Owner** | RoadmapMappingService |
| **Public API** | Có — Learner xác lập/đổi Goal; Learner xem Roadmap hiện tại; Learner phê duyệt/từ chối RoadmapNode qua Roadmap Governance (`ApprovalRecord`) |
| **Internal API** | Truy vấn `roadmap_node_knowledge_node` để KnowledgeExpansionService/TeachingService đọc dependency — không lộ trực tiếp dạng "raw graph query" ra Frontend, chỉ lộ qua Read Model đã tổng hợp (vd: "Roadmap progress view") |
| **Consumer** | Frontend (Goal/Roadmap view, Governance approval UI); KnowledgeExpansionService (đọc); TeachingService (đọc) |
| **Read Model** | `goal`, `roadmap`, `roadmap_node`, `approval_record`, `roadmap_node_knowledge_node` (qua Projection, không raw join) |
| **Write Model** | `goal` (immutable append, DECISION-032), `roadmap`/`roadmap_node`/`approval_record`, `roadmap_node_knowledge_node` (D6 — Dependency Edge Selection) |
| **AI-Internal-Only** | D6 reasoning (lý do chọn dependency edge) — chưa có cơ chế lưu (GAP-05), khi có sẽ là Internal API giữa RoadmapMappingService và ExplainabilityService/DecisionPersistenceService, không Public |

### 1.3 Learning Session (LearningSessionOrchestrationService)

| Thuộc tính | Giá trị |
|---|---|
| **Service Owner** | LearningSessionOrchestrationService |
| **Public API** | Có — Start/Pause/Resume/Complete `LearningSession`; xác nhận đề xuất Pause (DECISION-033 — Learner phải confirm, không tự động) |
| **Internal API** | Start/End `SubSession` — do TeachingService/MentorInteractionService trigger nội bộ khi Learner bắt đầu học 1 RoadmapNode, không phải lệnh Frontend gọi trực tiếp bằng `sub_session_id` tự chọn |
| **Consumer** | Frontend (start/pause/resume Learning Session, confirm pause); MentorInteractionService/TeachingService (đọc state để biết SubSession đang active) |
| **Read Model** | `learning_session`, `sub_session`, `learning_session_transition` (audit/history) |
| **Write Model** | `learning_session`, `sub_session`, `learning_session_transition` (DECISION-047, atomic với state transition) |

### 1.4 Mentor Interaction (MentorInteractionService + EvidenceCaptureService)

| Thuộc tính | Giá trị |
|---|---|
| **Service Owner** | MentorInteractionService (sở hữu `MentorSession`); EvidenceCaptureService (ghi `Evidence`/`EvidenceLink`, là 1 bước nội bộ trong cùng Service boundary) |
| **Public API** | Có — Learner gửi phản hồi trong `MentorSession` (tạo `Evidence`); Learner xem nội dung được TeachingService chọn |
| **Internal API** | D8 — Mode Selection (`MentorSessionModeChanged`) là quyết định nội tại, **không lộ ra như 1 API riêng Learner gọi** — Learner không "chọn Mode", Mode được hệ thống tự đổi và chỉ lộ ra như 1 thuộc tính đọc được của `MentorSession` |
| **Consumer** | Frontend (gửi phản hồi, đọc nội dung/Mode hiện tại); AssessmentService (consume `EvidenceRecorded`) |
| **Read Model** | `mentor_session` (current state, gồm Mode hiện tại — Mode History **không** persist, DECISION-048 D8 dùng Runtime Reconstruction nên không có Read Model lịch sử Mode) |
| **Write Model** | `mentor_session`, `evidence`/`evidence_link` |
| **AI-Internal-Only** | Input dùng để quyết định Mode Selection (D8) — không phải 1 API riêng, là dữ liệu Mentor Interaction tự đọc từ Evidence/AssessmentResult đã persist ở domain khác (điều kiện Runtime Reconstruction, chưa xác minh — HEADER_TRACELINK_BOUNDARY_REVIEW/DECISION-048) |

### 1.5 Assessment (AssessmentService)

| Thuộc tính | Giá trị |
|---|---|
| **Service Owner** | AssessmentService — write-owner duy nhất `KnowledgeNodeMastery` (DECISION-026) |
| **Public API** | Có, nhưng **chỉ đọc** — Learner xem `AssessmentResult`/`KnowledgeNodeMastery` của chính mình; **không có API Public nào để Learner "tạo" hoặc "sửa" AssessmentResult trực tiếp** — AssessmentResult luôn là hệ quả của Evidence, không phải input trực tiếp |
| **Internal API** | `EvidenceRecorded` → AssessmentService (event-driven, Eventual Consistency, mục 3 Boundary Matrix); gọi ExplainabilityService trong cùng transaction (GAP-04) |
| **Consumer** | Frontend (đọc AssessmentResult/Mastery); RecommendationService, DiscoveryService (đọc qua event) |
| **Read Model** | `assessment_result`, `knowledge_node_mastery` |
| **Write Model** | `assessment_result`, `knowledge_node_mastery`, `trace_link` (qua ExplainabilityService, cùng transaction) |
| **Never Public** | Write trực tiếp vào `knowledge_node_mastery` — chỉ AssessmentService được viết, không API nào khác (kể cả Internal) được phép ghi tắt vào bảng này |

### 1.6 Knowledge Graph (KnowledgeExpansionService)

| Thuộc tính | Giá trị |
|---|---|
| **Service Owner** | KnowledgeExpansionService |
| **Public API** | Có, hạn chế — Learner xem `KnowledgeNode`/`KnowledgeEdge` liên quan tới RoadmapNode đang học (Read Model đã lọc theo ngữ cảnh, không phải "xem toàn bộ Knowledge Graph thô"); Deep/Structural Expansion (D4) hiển thị `expansion_reason` cho Learner khi xảy ra |
| **Internal API** | Local Expansion (D5) — hoàn toàn AI-Internal, Learner không thấy, không có API Public nào trigger hoặc hiển thị D5 |
| **Consumer** | Frontend (xem Knowledge Graph theo ngữ cảnh, xem lý do Deep/Structural Expansion); TeachingService, RoadmapMappingService (đọc) |
| **Read Model** | `knowledge_node`, `knowledge_edge` (qua Recursive CTE, DECISION-039 — không lộ raw CTE ra API, chỉ lộ kết quả traversal đã tính) |
| **Write Model** | `knowledge_node`, `knowledge_edge`, `expansion_record` (Deep/Structural, atomic) |
| **AI-Internal-Only** | D5 reasoning (Local Expansion) — bắt buộc explainable nội bộ (DECISION-027/048) nhưng **chưa có cơ chế lưu** (GAP-02); khi có, đây là Internal API giữa KnowledgeExpansionService và cơ chế lưu, tuyệt đối không Public |

### 1.7 Evidence (write path nằm trong Mentor Interaction, domain riêng theo CoreDomainMap)

| Thuộc tính | Giá trị |
|---|---|
| **Service Owner** | EvidenceCaptureService (gọi từ trong MentorInteractionService) |
| **Public API** | Không có API Public riêng — Evidence luôn được tạo như hệ quả của 1 hành động Public khác (Learner phản hồi trong MentorSession), không có endpoint "tạo Evidence" độc lập mà Frontend gọi trực tiếp với payload Evidence tự do |
| **Internal API** | `EvidenceCaptureService` → `evidence`/`evidence_link` write, sau đó phát `EvidenceRecorded` |
| **Consumer** | AssessmentService (duy nhất) |
| **Read Model** | `evidence`, `evidence_link` (đọc lại cho Learner xem lịch sử phản hồi — Public, read-only) |
| **Write Model** | `evidence`, `evidence_link` — **không phân loại/đánh giá tại đây** (đúng Domain Boundary — phân loại là việc của AssessmentService) |

### 1.8 Recommendation (RecommendationService)

| Thuộc tính | Giá trị |
|---|---|
| **Service Owner** | RecommendationService |
| **Public API** | Có, chỉ đọc — Learner xem `RecommendationProposal` hiện có (kể cả loại "pause", để confirm qua LearningSessionOrchestrationService) |
| **Internal API** | Tổng hợp tín hiệu (`KnowledgeRegressionDetected`, `SelfAssessmentMismatchDetected`, dependency-gap query, pause-eligible signal) — **không có API nào để Learner hoặc Service khác "yêu cầu" RecommendationService tạo đề xuất theo ý muốn** — đây luôn là tự phát từ signal, không phải request-response nghiệp vụ |
| **Consumer** | Frontend (đọc đề xuất); LearningSessionOrchestrationService (đọc loại "pause"); TeachingService (đọc gợi ý ôn tập) |
| **Read Model** | `recommendation_proposal` (chưa build — schema-provisioned qua `trace_link.source_type`) |
| **Write Model** | `recommendation_proposal`, `trace_link` (`traced_to[]`, atomic — DECISION-027, không ngoại lệ) |
| **Never Public** | API "tạo Recommendation thủ công" theo yêu cầu Learner — vi phạm trực tiếp DECISION-019 (chỉ đề xuất, không tự thực thi theo yêu cầu bên ngoài luồng signal) |

### 1.9 Teaching (TeachingService — Capability điều phối, không Domain)

| Thuộc tính | Giá trị |
|---|---|
| **Service Owner** | TeachingService |
| **Public API** | Có — Learner nhận nội dung được chọn tiếp theo (D1 — Content Selection); Learner nhận mức can thiệp khi Stuck (D9b — Intervention Tier), nếu cơ chế Stuck Detection tồn tại |
| **Internal API** | Query `roadmap_node_knowledge_node` + `knowledge_node_mastery` + `knowledge_edge` + Learning Mode hiện tại — **toàn bộ là đọc nội bộ giữa Service, không phải API Learner gọi từng phần** — Learner chỉ nhận **kết quả** (nội dung được chọn), không gọi từng truy vấn con |
| **Consumer** | Frontend (nhận nội dung/can thiệp); gọi DecisionPersistenceService (khi mechanism tồn tại, GAP-01) |
| **Read Model** | Không sở hữu bảng nào — Read Model là tổng hợp Projection từ Knowledge/Roadmap/Assessment/Recommendation |
| **Write Model** | Không ghi Aggregate nghiệp vụ nào (đúng Boundary Matrix mục 1) — chỉ ghi Decision Header (pending mechanism) |
| **AI-Internal-Only** | D1/D9b reasoning trước khi mechanism Header tồn tại — hiện là gap hoàn toàn (GAP-01), không phải API thiếu, là **cơ chế lưu thiếu** |

### 1.10 Discovery (DiscoveryService)

| Thuộc tính | Giá trị |
|---|---|
| **Service Owner** | DiscoveryService |
| **Public API** | Có — Learner cung cấp self-assessment input (Goal Clarification, Competency Probing); Learner xem `SelfAssessmentMismatch` nếu được thiết kế hiển thị (chưa chốt) |
| **Internal API** | So sánh self-assessment vs `AssessmentResult`/`Evidence` lịch sử — đọc nội bộ, không phải Learner tự gọi "so sánh" |
| **Consumer** | Frontend (Discovery flow); RecommendationService (consume `SelfAssessmentMismatchDetected`) |
| **Read Model** | `discovery_session`, `self_assessment_mismatch` |
| **Write Model** | `discovery_session`, `self_assessment_mismatch`, `trace_link` (tự-trace, mới theo DECISION-048, atomic) |

### 1.11 Explainability (ExplainabilityService) — Cross-cutting

| Thuộc tính | Giá trị |
|---|---|
| **Service Owner** | ExplainabilityService — cơ chế ghi `TraceLink` duy nhất toàn hệ thống (DECISION-038) |
| **Public API** | **Không bao giờ.** Không có lý do nghiệp vụ nào để Frontend gọi trực tiếp "tạo TraceLink" |
| **Internal API** | Nhận `(source_type, source_id) → (target_type, target_id)` từ AssessmentService/RecommendationService/KnowledgeExpansionService/DiscoveryService — **gọi đồng bộ (function call/internal RPC), không qua message queue** (đã chốt ở Application Services Architecture mục 1.8) |
| **Consumer** | 4 Service nghiệp vụ kể trên — **không bao giờ Frontend, không bao giờ qua HTTP public route** |
| **Read Model** | Frontend **được đọc** `trace_link` gián tiếp — khi xem "vì sao AssessmentResult này", Frontend gọi Read API của AssessmentService (đã JOIN sẵn `trace_link`), không gọi ExplainabilityService trực tiếp |
| **Write Model** | `trace_link` — chỉ ExplainabilityService được viết |
| **AI-Internal-Only** | Toàn bộ — đây là ví dụ rõ nhất của "AI-Internal-Only" trong toàn hệ thống |

### 1.12 Decision Persistence (DecisionPersistenceService) — Cross-cutting

| Thuộc tính | Giá trị |
|---|---|
| **Service Owner** | DecisionPersistenceService — Decision Header Writer (mechanism pending, [HEADER_TRACELINK_BOUNDARY_REVIEW.md](../06_Database/HEADER_TRACELINK_BOUNDARY_REVIEW.md)) |
| **Public API** | **Không bao giờ**, cùng lý do ExplainabilityService |
| **Internal API** | Nhận `(decision_type, capability, learner_id, timestamp, reasoning_summary)` từ TeachingService (D1/D9b), MentorInteractionService (D8), DiscoveryService (D7), RoadmapMappingService (D6) — gọi đồng bộ, cùng transaction với Detail (khi có) |
| **Consumer** | 4 Service kể trên |
| **Read Model** | Frontend đọc gián tiếp qua Read API của Service sở hữu Detail tương ứng — **không có "Decision Timeline API" Public riêng cho tới khi mechanism được chốt và được đánh giá có nên lộ ra Public hay không (chưa có Round nào quyết định điều này)** |
| **Write Model** | Decision Header row (mechanism pending) — chỉ DecisionPersistenceService được viết |
| **AI-Internal-Only** | Toàn bộ, giống ExplainabilityService — không có cột `source_*`/`target_*` (ranh giới đã đóng ở HEADER_TRACELINK_BOUNDARY_REVIEW), không có lý do để Public truy vấn trực tiếp |

---

## 2. Kết luận theo yêu cầu Task 1

### 2.1 API thuộc Backend (mọi API ở mục 1, trừ phần Supabase Auth tự quản lý)

Toàn bộ Public API và Internal API ở mục 1 thuộc `Apps/backend` — không có API nghiệp vụ nào (ngoài đăng ký/đăng nhập qua Supabase Auth SDK) được phép tồn tại độc lập ở tầng khác, vì mọi Command có ý nghĩa explainability đều cần đi qua đúng Service đã chốt write-ownership (CoreDomainMap mục 5) và đúng atomic transaction (APPLICATION_SERVICE_BOUNDARY_MATRIX.md mục 2).

### 2.2 API không bao giờ được expose Public

| # | API/Write path | Vì sao |
|---|---|---|
| 1 | Ghi trực tiếp `trace_link` (ExplainabilityService) | Cross-cutting, không nghiệp vụ Learner-facing — mục 1.11 |
| 2 | Ghi trực tiếp Decision Header (DecisionPersistenceService) | Cross-cutting, ranh giới đã đóng — mục 1.12 |
| 3 | Ghi trực tiếp `knowledge_node_mastery` ngoài AssessmentService | Vi phạm write-ownership duy nhất (DECISION-026) |
| 4 | "Tạo Recommendation theo yêu cầu" | Vi phạm DECISION-019 (Proposal-Only, tự phát từ signal) |
| 5 | Cascade delete `auth.users` không qua Anonymization | Vi phạm DECISION-037 |
| 6 | D5 (Local Expansion) reasoning hiển thị cho Learner | Theo định nghĩa, D5 là truy vết nội bộ, không hiển thị (DECISION-023/027) |
| 7 | D8 Mode History (lịch sử đổi Mode dạng Persisted Record) | Không tồn tại — D8 dùng Runtime Reconstruction, không có gì để expose dạng "history list" |

### 2.3 API AI-internal only

ExplainabilityService và DecisionPersistenceService (mục 1.11, 1.12) là 2 API hoàn toàn AI-internal-only — không phục vụ Learner trực tiếp dưới bất kỳ hình thức nào, chỉ phục vụ 6 Service nghiệp vụ gọi tới chúng trong cùng transaction.

---

## Liên kết ngược

[COMMAND_QUERY_ARCHITECTURE.md](COMMAND_QUERY_ARCHITECTURE.md), [FRONTEND_BACKEND_INTERACTION_REVIEW.md](FRONTEND_BACKEND_INTERACTION_REVIEW.md), [AI_SERVICE_API_REVIEW.md](AI_SERVICE_API_REVIEW.md), [APPLICATION_SERVICES_ARCHITECTURE.md](../06_Database/APPLICATION_SERVICES_ARCHITECTURE.md), [APPLICATION_SERVICE_BOUNDARY_MATRIX.md](../06_Database/APPLICATION_SERVICE_BOUNDARY_MATRIX.md), [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md), [SupabaseCompatibilityReview.md](../06_Database/SupabaseCompatibilityReview.md).
