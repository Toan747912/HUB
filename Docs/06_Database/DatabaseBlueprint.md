# Database Blueprint — AI Mentor OS

> Database Design Phase — **Step 4A** (theo [DECISION-040](../11_Decisions/DECISION-040-Physical-Database-Design-Split.md)). Xây trên [LogicalDatabaseModel.md](LogicalDatabaseModel.md) (Step 2), [PersistenceArchitecture.md](PersistenceArchitecture.md) (Step 1), [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) (Step 3) và [PHYSICAL_DESIGN_READINESS.md](PHYSICAL_DESIGN_READINESS.md). Áp dụng [DECISION-039](../11_Decisions/DECISION-039-Knowledge-Graph-Persistence.md) (Knowledge Graph = bảng quan hệ + Recursive CTE).
>
> **Chỉ thiết kế ở mức bảng/quan hệ/chiến lược — KHÔNG viết SQL, không `CREATE TABLE`, không cột cụ thể, không kiểu dữ liệu, không index/constraint cụ thể.** Mỗi "Entity" dưới đây tương ứng 1 bảng ở Step 4B, nhưng tên cột/kiểu dữ liệu chưa được định nghĩa ở tài liệu này.
>
> **Đã cập nhật sau Pre-DDL Platform Alignment** ([PLATFORM_ALIGNMENT_REVIEW.md](PLATFORM_ALIGNMENT_REVIEW.md)): mục 1.1 (`Learner`) — PK Strategy đổi thành UUID chia sẻ với `auth.users.id` ([DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md)); mục 1.11 (`KnowledgeNodeMastery`) — Versioning đổi thành `version_number` ([DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md)); Temporal Requirement của `Roadmap`/`RoadmapNode`/`KnowledgeNodeMastery`/`LearningSession`/`SubSession` đổi thành "không cần History Table riêng — đã có companion log" ([DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md)).

## 0. Phạm vi

20 entity: 18 candidate entity đã READY ở [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 1 + `TraceLink` ([DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md)) + `LearningSessionTransition` (Supporting Persistence Entity, [DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md), thêm ở Step 4B Round 1). `LearningProfile` không xuất hiện (Projection, không có persistence boundary riêng — [DECISION-036](../11_Decisions/DECISION-036-LearningProfile-Is-Projection.md)).

---

## 1. Entity Blueprint

Quy ước PK Strategy: **ULID** = nhóm append-only tần suất ghi cao; **Sequential** = nhóm Current State Snapshot ([PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 2). Mọi entity có khả năng lộ ra ngoài (API công khai/cross-system với AI Service) cần thêm 1 định danh public riêng — đánh dấu **[Public ID]** khi áp dụng.

### 1.1 Learner

| Mục | Nội dung |
|---|---|
| Purpose | Định danh người học — gốc của mọi tham chiếu `learner_id` trong hệ thống |
| Aggregate | Root (độc lập) — Boundary 1 |
| Lifecycle | Created → Active (mutable) → **Anonymized** (right-to-be-forgotten, [DECISION-037](../11_Decisions/DECISION-037-Right-To-Be-Forgotten-Anonymization.md)) — không Hard Delete |
| PK Strategy | **UUID, chia sẻ trực tiếp với `auth.users.id`** (Supabase Auth) — không có PK nội bộ riêng, không có Public ID riêng ([DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md), thay cho đề xuất Sequential/Identity-friendly ban đầu) |
| FK Relationships | `id` là FK tới `auth.users.id` (ngoài phạm vi Domain Architecture, do Supabase quản lý) — không có FK nghiệp vụ ra ngoài (là gốc của graph tham chiếu nghiệp vụ) |
| Uniqueness Rules | 🔶 Chưa chốt ở Domain Architecture — ràng buộc định danh (ví dụ email/auth identifier duy nhất) thuộc phạm vi Supabase Auth, không phải Domain Architecture ([PersistenceArchitecture.md](PersistenceArchitecture.md) mục 1) |
| Versioning | Không cần concurrency token bắt buộc (rủi ro ghi đồng thời thấp) — `version_number` không có hại nếu áp dụng đồng nhất ([DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md)) |
| Audit Requirements | Không cần audit log riêng ở phạm vi Domain Architecture; trường nhạy cảm (đổi email/auth) là yêu cầu Security/Compliance của Supabase Auth, ngoài phạm vi này |
| Temporal Requirement | History Table trigger-maintained (schema `history`) — không có companion log sẵn ([DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md)) |
| Retention Requirement | Vĩnh viễn khi tài khoản active; Anonymized khi right-to-be-forgotten — **`ON DELETE RESTRICT`** trên FK tới `auth.users.id`, Anonymize phải hoàn tất trước khi xóa `auth.users` ([DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md), [DECISION-037](../11_Decisions/DECISION-037-Right-To-Be-Forgotten-Anonymization.md)) |

### 1.2 Goal

| Mục | Nội dung |
|---|---|
| Purpose | Phát biểu mục tiêu học tập của Learner — gốc của 1 `LearningSession`/`Roadmap` |
| Aggregate | Root (độc lập) — Boundary 2 |
| Lifecycle | Created (immutable) → **Superseded** (khi Learner đổi Goal — bản ghi cũ không đổi, chỉ bị "thay thế" bởi Goal mới, [DECISION-032](../11_Decisions/DECISION-032-Immutable-Goal.md)) |
| PK Strategy | Sequential/Identity-friendly |
| FK Relationships | `learner_id` → `Learner` (bắt buộc) |
| Uniqueness Rules | Business invariant (không phải UNIQUE constraint đơn giản): tại một thời điểm, đúng 1 Goal trong chuỗi `supersedes`/`superseded_by` của 1 Learner là "chưa bị thay thế" — Physical Design cần quyết định cách thực thi (filtered index hay Application Layer) |
| Versioning | Không cần — immutable, chuỗi `superseded_by`/`supersedes` đủ |
| Audit Requirements | Audit-by-immutability — bản ghi không đổi chính là audit trail |
| Temporal Requirement | Không cần Temporal Table — append-only/immutable |
| Retention Requirement | Vĩnh viễn |

### 1.3 Roadmap

| Mục | Nội dung |
|---|---|
| Purpose | Cấu trúc lộ trình học tập cho 1 Goal — cây `RoadmapNode` |
| Aggregate | Root, chứa `RoadmapNode[]`, `ApprovalRecord[]` — Boundary 3 |
| Lifecycle | Created → Mutated qua `ApprovalRecord` (lặp lại) → đứng yên khi `LearningSession` gắn Goal của nó chuyển Completed/Archived |
| PK Strategy | Sequential/Identity-friendly |
| FK Relationships | `goal_id` → `Goal` (bắt buộc, 1–1) |
| Uniqueness Rules | Unique `goal_id` (1 Roadmap / Goal, theo cardinality 1–1 ở [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 2) |
| Versioning | Không cần version field riêng — bảo vệ qua cổng `ApprovalRecord` (mỗi approval = 1 "version" hợp lệ của cấu trúc) |
| Audit Requirements | Audit-by-companion-log — lịch sử nằm ở `ApprovalRecord`, không cần audit log song song |
| Temporal Requirement | **Không cần History Table riêng** — đã có companion log (`ApprovalRecord`), thêm History Table sẽ trùng lặp 2 nguồn sự thật ([DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md)) |
| Retention Requirement | Vĩnh viễn, archive cùng Goal (không xóa) |

### 1.4 RoadmapNode

| Mục | Nội dung |
|---|---|
| Purpose | 1 nút trong cây lộ trình (chủ đề/kỹ năng cần đạt) |
| Aggregate | Con trong Aggregate `Roadmap` — Boundary 3 |
| Lifecycle | Created → Mutated qua `ApprovalRecord` → 🔶 trạng thái "retired/superseded" khi Learner bỏ 1 nhánh — đề xuất, chưa chốt ([PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 4) |
| PK Strategy | Sequential/Identity-friendly |
| FK Relationships | `roadmap_id` → `Roadmap` (bắt buộc); `parent_roadmap_node_id` → `RoadmapNode` (tự tham chiếu, cây — nullable cho gốc); quan hệ M:N với `KnowledgeNode` qua bảng nối (Dependency Edge, [DECISION-015](../11_Decisions/DECISION-015-Knowledge-Engine.md)) |
| Uniqueness Rules | 🔶 Chưa chốt — vị trí/tên trong cây có cần duy nhất theo `(roadmap_id, parent_roadmap_node_id, ...)` hay không, để Physical Design quyết định |
| Versioning | Không cần — bảo vệ qua `ApprovalRecord` |
| Audit Requirements | Audit-by-companion-log qua `ApprovalRecord` |
| Temporal Requirement | **Không cần History Table riêng** — cùng lý do với `Roadmap` ([DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md)) |
| Retention Requirement | Vĩnh viễn, archive cùng `Roadmap`/Goal |

### 1.5 ApprovalRecord

| Mục | Nội dung |
|---|---|
| Purpose | Ghi nhận 1 lần phê duyệt thay đổi cấu trúc `Roadmap`/`RoadmapNode` ([DECISION-006](../11_Decisions/DECISION-006-Roadmap-Governance.md)) |
| Aggregate | Con trong Aggregate `Roadmap` — Boundary 3 |
| Lifecycle | Created (immutable, append-only) |
| PK Strategy | ULID-style |
| FK Relationships | `roadmap_id` → `Roadmap` (bắt buộc); tham chiếu `roadmap_node_id` khi áp dụng cho 1 node cụ thể (tùy ngữ cảnh đổi) |
| Uniqueness Rules | Không có — nhiều ApprovalRecord trên cùng `Roadmap` qua thời gian là bình thường |
| Versioning | Không cần — append-only |
| Audit Requirements | Audit-by-immutability — chính nó là audit trail cho `Roadmap`/`RoadmapNode` |
| Temporal Requirement | Không cần Temporal Table |
| Retention Requirement | Vĩnh viễn |

### 1.6 KnowledgeNode

| Mục | Nội dung |
|---|---|
| Purpose | 1 đơn vị tri thức trong Knowledge Graph (concept), có thể mở rộng thành node con ([DECISION-015](../11_Decisions/DECISION-015-Knowledge-Engine.md), [DECISION-024](../11_Decisions/DECISION-024-Concept-Is-KnowledgeNode.md)) |
| Aggregate | Root, chứa `KnowledgeEdge[]` đi ra, `ExpansionRecord[]` — Boundary 4 |
| Lifecycle | Created → (nội dung có thể sửa — 🔶 OPEN, [LogicalDatabaseModel.md](LogicalDatabaseModel.md) Open Question #4) — không bao giờ xóa |
| PK Strategy | Sequential/Identity-friendly |
| FK Relationships | `parent_knowledge_node_id` tùy chọn (nếu sinh từ Expansion — không bắt buộc, không phải cây 1 cha vì DAG dùng `KnowledgeEdge`, [DECISION-039](../11_Decisions/DECISION-039-Knowledge-Graph-Persistence.md)) |
| Uniqueness Rules | 🔶 Chưa chốt — không có dedup rule chính thức cho node trùng ngữ nghĩa (ví dụ 2 node cùng mô tả 1 concept) — Physical Design/Application Layer cần xử lý nếu phát sinh |
| Versioning | 🔶 Chưa chốt — version/history cho nội dung sửa (kế thừa Open Question #4) |
| Audit Requirements | Tự audit qua `created_via`/timestamp cho phần tạo mới; sửa nội dung 🔶 chưa có cơ chế audit chốt |
| Temporal Requirement | History Table trigger-maintained (schema `history`) — không có companion log, hỗ trợ trực tiếp nếu sau này chốt cần version cho nội dung sửa ([DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md)) |
| Retention Requirement | Vĩnh viễn — Knowledge Graph dùng chung, không xóa |

### 1.7 KnowledgeEdge

| Mục | Nội dung |
|---|---|
| Purpose | 1 cạnh có hướng trong Knowledge Graph DAG (multi-parent, multi relation-type, [DECISION-025](../11_Decisions/DECISION-025-Knowledge-Graph-DAG.md)) |
| Aggregate | Con trong Aggregate `KnowledgeNode` — Boundary 4 |
| Lifecycle | Created (immutable, append-only) — không bao giờ sửa/xóa; không có cơ chế "retract" cạnh sai (Risk đã biết) |
| PK Strategy | ULID-style |
| FK Relationships | `from_knowledge_node_id` → `KnowledgeNode`; `to_knowledge_node_id` → `KnowledgeNode` (bảng quan hệ thông thường theo DECISION-039, không phải Graph Extensions) |
| Uniqueness Rules | 🔶 Khuyến nghị (chưa khóa): tránh edge trùng hoàn toàn `(from_knowledge_node_id, to_knowledge_node_id, relation_type)` — không bắt buộc vì triết lý append-only cho phép thêm cạnh mới dù trùng |
| Versioning | Không cần — append-only tự nhiên là lịch sử đầy đủ |
| Audit Requirements | Audit-by-immutability |
| Temporal Requirement | Không cần Temporal Table |
| Retention Requirement | Vĩnh viễn — không xóa (Risk vận hành: tăng nhanh khi graph mở rộng, đã biết và chấp nhận ở DECISION-029) |

### 1.8 ExpansionRecord

| Mục | Nội dung |
|---|---|
| Purpose | Ghi nhận 1 lần Knowledge Node Expansion loại Deep/Structural ([DECISION-023](../11_Decisions/DECISION-023-Controlled-Knowledge-Expansion.md)) |
| Aggregate | Con trong Aggregate `KnowledgeNode` — Boundary 4 |
| Lifecycle | Created (immutable, append-only) |
| PK Strategy | ULID-style |
| FK Relationships | `knowledge_node_id` → `KnowledgeNode` (bắt buộc) |
| Uniqueness Rules | Không có |
| Versioning | Không cần |
| Audit Requirements | Audit-by-immutability — bắt buộc hiển thị cho Deep/Structural Expansion (DECISION-027) |
| Temporal Requirement | Không cần Temporal Table |
| Retention Requirement | Vĩnh viễn |

### 1.9 Evidence

| Mục | Nội dung |
|---|---|
| Purpose | 1 bằng chứng học tập (bài làm, tương tác...) làm nguồn cho Assessment/Mastery |
| Aggregate | Root, chứa `EvidenceLink[]` — Boundary 5 |
| Lifecycle | Created (immutable hoàn toàn) — không có cơ chế "vô hiệu hóa" Evidence sai (🔶 Open Question) |
| PK Strategy | ULID-style |
| FK Relationships | `learner_id` → `Learner` (bắt buộc); `mentor_session_id` → `MentorSession` (🔶 bắt buộc hay tùy chọn — chưa chốt, [LogicalDatabaseModel.md](LogicalDatabaseModel.md) Open Question #2) |
| Uniqueness Rules | Không có |
| Versioning | Không áp dụng — sửa = tạo record mới |
| Audit Requirements | Audit-by-immutability |
| Temporal Requirement | Không cần Temporal Table |
| Retention Requirement | Vĩnh viễn — xóa phá vỡ chuỗi `traced_to[]`/`TraceLink` của mọi `AssessmentResult` tham chiếu |

### 1.10 EvidenceLink

| Mục | Nội dung |
|---|---|
| Purpose | Liên kết 1 `Evidence` tới 1 `KnowledgeNode` cụ thể, mang chiều support/refute ([DECISION-022](../11_Decisions/DECISION-022-Evidence-KnowledgeNode-M2M.md)) |
| Aggregate | Con trong Aggregate `Evidence` — Boundary 5 |
| Lifecycle | Created (immutable, append-only) |
| PK Strategy | ULID-style |
| FK Relationships | `evidence_id` → `Evidence` (bắt buộc); `knowledge_node_id` → `KnowledgeNode` (bắt buộc, Restrict — không trỏ tới node đã xóa, dù thực tế không xảy ra) |
| Uniqueness Rules | 🔶 Khuyến nghị (chưa khóa): `(evidence_id, knowledge_node_id, stance)` — 1 Evidence có thể support/refute cùng 1 node qua nhiều link nếu khác `stance`, cần Physical Design xác nhận |
| Versioning | Không cần |
| Audit Requirements | Audit-by-immutability |
| Temporal Requirement | Không cần Temporal Table |
| Retention Requirement | Vĩnh viễn |

### 1.11 KnowledgeNodeMastery

| Mục | Nội dung |
|---|---|
| Purpose | Trạng thái "tin hiện tại" về mức độ hiểu của 1 Learner với 1 KnowledgeNode (Remember/Explain/Apply/Teach, [DECISION-030](../11_Decisions/DECISION-030-Assessment-Result-Granularity.md)) |
| Aggregate | Root (độc lập) — Boundary 6 |
| Lifecycle | Created (lần đầu có Evidence) → Updated liên tục (ghi trực tiếp mỗi `AssessmentResult` mới) — không bao giờ xóa |
| PK Strategy | Sequential/Identity-friendly |
| FK Relationships | `learner_id` → `Learner`; `knowledge_node_id` → `KnowledgeNode`; liên kết ngược bắt buộc, non-nullable tới `AssessmentResult` mới nhất gây ra giá trị hiện tại (Explainability First) |
| Uniqueness Rules | **Unique `(learner_id, knowledge_node_id)`** — khóa cứng ở [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 2 ("1 KnowledgeNodeMastery / Learner×KnowledgeNode") |
| Versioning | **Cần concurrency token — `version_number`** (bigint, trigger-incremented) — rủi ro ghi đồng thời cao nhất trong hệ thống (PersistenceArchitecture.md Risk #1, [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md), thay cho đề xuất `rowversion` ban đầu) |
| Audit Requirements | Không tự audit được nếu đứng riêng — phải join ngược `AssessmentResult` mới nhất, liên kết này không được nullable |
| Temporal Requirement | **Không cần History Table riêng** — đã có companion log (`AssessmentResult`), thêm History Table sẽ trùng lặp 2 nguồn sự thật ([DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md)) |
| Retention Requirement | Chỉ cần giữ giá trị mới nhất — lịch sử đã có ở `AssessmentResult` |

### 1.12 AssessmentResult

| Mục | Nội dung |
|---|---|
| Purpose | 1 kết quả đánh giá cụ thể — artifact explainability chính của hệ thống (8 trường theo DECISION-030) |
| Aggregate | Root (độc lập) — Boundary 7 |
| Lifecycle | Created (immutable, append-only) |
| PK Strategy | ULID-style |
| FK Relationships | `learner_id` → `Learner`; `knowledge_node_id` → `KnowledgeNode` (bắt buộc, Restrict); Evidence References qua `TraceLink` (không phải FK trực tiếp, theo DECISION-038) |
| Uniqueness Rules | Không có — nhiều AssessmentResult / Learner×KnowledgeNode theo thời gian là bình thường (🔶 cardinality chính xác là Open Question #20 kế thừa) |
| Versioning | Không cần — immutable |
| Audit Requirements | Audit-by-immutability — chính nó là artifact explainability |
| Temporal Requirement | Không cần Temporal Table |
| Retention Requirement | Vĩnh viễn |

### 1.13 DiscoverySession

| Mục | Nội dung |
|---|---|
| Purpose | 1 phiên khám phá (Discovery Engine) phát hiện sai lệch tự đánh giá của Learner |
| Aggregate | Root, chứa `SelfAssessmentMismatch[]` — Boundary 8 |
| Lifecycle | Created → Active → Ended |
| PK Strategy | Sequential/Identity-friendly |
| FK Relationships | `learner_id` → `Learner` (bắt buộc) |
| Uniqueness Rules | Không có |
| Versioning | Không cần — không có concurrent edit trên 1 session |
| Audit Requirements | Không cần audit log riêng — đơn giản, không đổi từ Round 1 |
| Temporal Requirement | History Table trigger-maintained (schema `history`) — không có companion log ([DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md)) |
| Retention Requirement | Vĩnh viễn |

### 1.14 SelfAssessmentMismatch

| Mục | Nội dung |
|---|---|
| Purpose | 1 phát hiện cụ thể: Learner tự đánh giá sai so với Mastery thực tế |
| Aggregate | Con trong Aggregate `DiscoverySession` — Boundary 8 |
| Lifecycle | Created (immutable, append-only) |
| PK Strategy | ULID-style |
| FK Relationships | `discovery_session_id` → `DiscoverySession` (bắt buộc); `knowledge_node_id` → `KnowledgeNode` (bắt buộc) |
| Uniqueness Rules | Không có |
| Versioning | Không cần |
| Audit Requirements | Audit-by-immutability |
| Temporal Requirement | Không cần Temporal Table |
| Retention Requirement | Vĩnh viễn |

### 1.15 MentorSession

| Mục | Nội dung |
|---|---|
| Purpose | 1 lượt tương tác Mentor–Learner (có thể đổi Learning Mode giữa phiên) |
| Aggregate | Root (độc lập) — Boundary 9 |
| Lifecycle | Created → Active (có thể đổi Learning Mode) → Ended (immutable sau khi kết thúc) |
| PK Strategy | Sequential/Identity-friendly |
| FK Relationships | `learner_id` → `Learner` (bắt buộc); tham chiếu từ `SubSession` (không sở hữu — Aggregate khác, Restrict/Archive độc lập) |
| Uniqueness Rules | Không có |
| Versioning | Không cần — immutable sau khi Ended |
| Audit Requirements | Cần biết khi nào Paused, do ai/cái gì kích hoạt (DECISION-033) — qua liên kết `TraceLink`, không phải cột rời |
| Temporal Requirement | History Table trigger-maintained (schema `history`) — không có companion log ([DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md)) |
| Retention Requirement | Vĩnh viễn |

### 1.16 RecommendationProposal

| Mục | Nội dung |
|---|---|
| Purpose | 1 đề xuất từ Recommendation Engine (bao gồm đề xuất pause, đổi roadmap...) |
| Aggregate | Root (độc lập) — Boundary 10 |
| Lifecycle | Created (Proposed, nội dung immutable) → **Confirmed** \| **Ignored** (1 lần chuyển, ghi nhận như fact bổ sung — không update tại chỗ) |
| PK Strategy | Sequential/Identity-friendly (theo nhóm Snapshot ở PhysicalDesignPreparation.md — nội dung đề xuất immutable nhưng trạng thái xử lý là 1 fact bổ sung riêng, không phải sửa tại chỗ) |
| FK Relationships | `learner_id` → `Learner` (bắt buộc); `traced_to[]` qua `TraceLink` (không phải FK trực tiếp, DECISION-038) |
| Uniqueness Rules | Không có — toàn bộ lịch sử đề xuất (kể cả bị bỏ qua) được giữ |
| Versioning | Không áp dụng cho nội dung; trạng thái xử lý chỉ 1 lần chuyển, không cần version |
| Audit Requirements | `traced_to[]` bắt buộc non-nullable, không ngoại lệ (DECISION-027) |
| Temporal Requirement | Không cần Temporal Table bắt buộc — trạng thái xử lý nên là fact bổ sung (bảng/record riêng), không phải cột mutable cần Temporal Table |
| Retention Requirement | Vĩnh viễn — giữ toàn bộ Recommendation history (Risk vận hành: tăng không giới hạn theo thời gian, đã biết) |

### 1.17 LearningSession

| Mục | Nội dung |
|---|---|
| Purpose | Orchestrator runtime cho 1 Goal — điều phối Roadmap/Knowledge/Evidence/Assessment/Recommendation |
| Aggregate | Root, chứa `SubSession[]` — Boundary 11 |
| Lifecycle | Started → Active ⇄ Paused → **Completed** \| **Archived** (terminal, DECISION-028/032/033) |
| PK Strategy | Sequential/Identity-friendly |
| FK Relationships | `learner_id` → `Learner`; `goal_id` → `Goal` (bắt buộc, 1–1) |
| Uniqueness Rules | **Unique `goal_id`** — "Mỗi Goal có đúng 1 LearningSession trong toàn vòng đời" (DECISION-028/032, khóa cứng) |
| Versioning | Không cần concurrency token riêng (không có nhiều tác nhân ghi state cùng lúc theo Domain Architecture hiện tại) |
| Audit Requirements | Cần biết nguồn gốc transition (đặc biệt → Paused: tự Learner hay qua Recommendation) — qua `TraceLink`, không chỉ giá trị `state` |
| Temporal Requirement | **Không cần History Table riêng** — companion log (transition log khuyến nghị) đóng vai trò lịch sử ([DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md)) |
| Retention Requirement | Vĩnh viễn cho session Completed/Archived (Memory Profile phụ thuộc) |

### 1.18 SubSession

| Mục | Nội dung |
|---|---|
| Purpose | 1 đơn vị làm việc cụ thể trong `LearningSession`, phạm vi 1 `RoadmapNode`/`KnowledgeNode` |
| Aggregate | Con trong Aggregate `LearningSession` — Boundary 11 |
| Lifecycle | Started (Active) → Ended — không có Paused riêng |
| PK Strategy | Sequential/Identity-friendly |
| FK Relationships | `learning_session_id` → `LearningSession` (bắt buộc); `roadmap_node_id`/`knowledge_node_id` → phạm vi (1 trong 2, tùy ngữ cảnh); tham chiếu (không sở hữu) tới `MentorSession` |
| Uniqueness Rules | Không có |
| Versioning | Không cần |
| Audit Requirements | Kế thừa từ `LearningSession` — không cần audit log riêng |
| Temporal Requirement | **Không cần History Table riêng** — cùng lý do với `LearningSession` ([DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md)) |
| Retention Requirement | Vĩnh viễn, cascade theo `LearningSession` |

### 1.19 LearningSessionTransition *(Supporting Persistence Entity, [DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md))*

| Mục | Nội dung |
|---|---|
| Purpose | Ghi nhận mỗi lần `LearningSession.state` đổi (`from_state`/`to_state`/tác nhân kích hoạt) — thực thi yêu cầu Audit đã khóa ở DECISION-033/045, không phải khái niệm nghiệp vụ mới |
| Aggregate | **Không phải Domain Entity/Aggregate riêng** — con phụ trợ (Supporting Persistence Entity) trong Aggregate `LearningSession`, Boundary 11 |
| Lifecycle | Created → (không đổi, vĩnh viễn) — append-only |
| PK Strategy | ULID-style (sinh ở Application Layer) — cùng nhóm với entity append-only khác |
| FK Relationships | `learning_session_id → LearningSession` (bắt buộc) |
| Uniqueness Rules | Không có — nhiều transition / `LearningSession` qua thời gian là bình thường |
| Versioning | Không cần — append-only |
| Audit Requirements | Tự audit qua `occurred_at`/`transition_actor_type` — không cần audit log riêng cho chính nó (đã là audit log cho `LearningSession`) |
| Temporal Requirement | Không cần Temporal Table — append-only |
| Retention Requirement | Vĩnh viễn |

### 1.20 TraceLink

| Mục | Nội dung |
|---|---|
| Purpose | Quan hệ truy vết có hướng giữa 1 entity "kết quả/quyết định" và 1 entity "nguồn gốc" — hạ tầng cross-cutting cho Explainability First ([DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md)) |
| Aggregate | **Không thuộc Core Domain nào** — hạ tầng cross-cutting, không phải Aggregate Root nghiệp vụ |
| Lifecycle | Created → (không đổi, vĩnh viễn) — luôn tạo cùng giao dịch với entity nó mô tả, không bao giờ sửa/xóa |
| PK Strategy | ULID-style |
| FK Relationships | `source_type` + `source_id` (đa hình theo định kiểu — `AssessmentResult`/`RecommendationProposal`/Local Expansion); `target_type` + `target_id` (đa hình — `Evidence`/`AssessmentResult`/`DiscoverySession`) — đây là **lý do TraceLink tồn tại**: gom đa hình vào 1 entity riêng thay vì rải FK nullable trên từng bảng nghiệp vụ |
| Uniqueness Rules | 🔶 Khuyến nghị (chưa khóa): tránh `(source_type, source_id, target_type, target_id)` trùng hoàn toàn — không bắt buộc, để Physical Design quyết định |
| Versioning | Không cần — immutable |
| Audit Requirements | Audit-by-immutability — chính nó là cơ chế audit/explainability cho domain khác |
| Temporal Requirement | Không cần Temporal Table |
| Retention Requirement | Vĩnh viễn |

---

## 2. Relationship Matrix

| Quan hệ | Cardinality | Ownership (write) | Delete Behavior | Archive Behavior |
|---|---|---|---|---|
| `Learner` — `Goal` | 1 — * | Identity (Learner) / Goal&Roadmap (Goal) | Không xóa | `Learner`: Anonymize; `Goal`: Superseded (không xóa, "thay thế") |
| `Goal` — `Roadmap` | 1 — 1 | Goal&Roadmap | Không xóa | Archive cùng nhau khi `LearningSession` gắn Goal chuyển Archived |
| `Roadmap` — `RoadmapNode` | 1 — * | Goal&Roadmap | Cascade (trong Aggregate) — không có thực tế ngoài Aggregate | Đứng yên cùng `Roadmap` |
| `RoadmapNode` — `RoadmapNode` (tự tham chiếu) | 1 — * (cha-con) | Goal&Roadmap | Cascade (trong Aggregate) | Cùng `Roadmap` |
| `RoadmapNode` — `KnowledgeNode` | * — * | Goal&Roadmap (cạnh Dependency) / Knowledge (node) | Restrict (lý thuyết — KnowledgeNode không xóa) | Không áp dụng |
| `Roadmap`/`RoadmapNode` — `ApprovalRecord` | 1 — * | Goal&Roadmap | Không xóa (append-only) | Không áp dụng |
| `KnowledgeNode` — `KnowledgeNode` (qua `KnowledgeEdge`) | * — * (DAG) | Knowledge | Cascade lý thuyết (không thực tế — Node không xóa) | Không áp dụng |
| `KnowledgeNode` — `ExpansionRecord` | 1 — * | Knowledge | Cascade (trong Aggregate) | Không áp dụng |
| `Evidence` — `EvidenceLink` | 1 — * | Evidence | Cascade (trong Aggregate) | Không áp dụng |
| `EvidenceLink` — `KnowledgeNode` | * — 1 | Evidence (link) / Knowledge (node) | Restrict | Không áp dụng |
| `Evidence` — `Learner` | * — 1 | Evidence | Không xóa | Anonymize (Learner) |
| `Evidence` — `MentorSession` | * — 1 (🔶 tùy chọn) | Evidence | Restrict / Archive độc lập | Không áp dụng |
| `KnowledgeNodeMastery` — `Learner` | * — 1 | Assessment | Không xóa | Anonymize (Learner) |
| `KnowledgeNodeMastery` — `KnowledgeNode` | * — 1 (unique cặp) | Assessment | Restrict | Không áp dụng |
| `AssessmentResult` — `KnowledgeNode` | * — 1 | Assessment | Restrict | Không áp dụng |
| `AssessmentResult`/`RecommendationProposal` — nguồn (qua `TraceLink`) | * — * (đa hình, qua TraceLink) | Domain tạo entity kết quả tự ghi `TraceLink` | Restrict (nguồn không bao giờ xóa) | Không áp dụng |
| `DiscoverySession` — `Learner` | * — 1 | Discovery | Không xóa | Anonymize (Learner) |
| `DiscoverySession` — `SelfAssessmentMismatch` | 1 — * | Discovery | Cascade (trong Aggregate) | Không áp dụng |
| `SelfAssessmentMismatch` — `KnowledgeNode` | * — 1 | Discovery (mismatch) / Knowledge (node) | Restrict | Không áp dụng |
| `MentorSession` — `Learner` | * — 1 | Mentor Interaction | Không xóa | Anonymize (Learner) |
| `MentorSession` — `SubSession` | * — 1 | Mentor Interaction (session) / Learning Session (sub) | Restrict / Archive độc lập (Aggregate khác nhau) | `MentorSession` không bị sửa/xóa khi `SubSession` Archived |
| `RecommendationProposal` — `Learner` | * — 1 | Recommendation | Không xóa | Anonymize (Learner) |
| `LearningSession` — `Learner` | * — 1 | Learning Session | Không xóa | Anonymize (Learner) |
| `LearningSession` — `Goal` | 1 — 1 (unique) | Learning Session | Không xóa | Archive cùng nhau khi Goal bị "thay thế" |
| `LearningSession` — `SubSession` | 1 — * | Learning Session | Cascade (trong Aggregate) | Cùng `LearningSession` |
| `SubSession` — `RoadmapNode`/`KnowledgeNode` | * — 1 | Learning Session (sub) / domain tương ứng (phạm vi) | Restrict | Không áp dụng |
| `TraceLink` — entity nguồn/đích (đa hình) | * — * | Domain tạo entity "kết quả" | Restrict (cả 2 chiều — nguồn và TraceLink không bao giờ xóa) | Không áp dụng |

**Quy tắc chung rút ra (không lặp lại theo từng dòng):** không có Cascade Delete nào vượt ra ngoài 1 Aggregate; giữa Aggregate với Aggregate chỉ có **Restrict** hoặc **Archive** (chuyển trạng thái) — theo [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 6.

---

## 3. Database Modules

Nhóm 19 entity theo domain write-owner ([CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 5) — phục vụ tổ chức schema/migration theo module, không phải ranh giới database vật lý riêng (toàn bộ vẫn 1 database theo SQL Server, [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 7):

| Module | Entity |
|---|---|
| **Identity** | `Learner` |
| **Goal & Roadmap** | `Goal`, `Roadmap`, `RoadmapNode`, `ApprovalRecord` |
| **Knowledge** | `KnowledgeNode`, `KnowledgeEdge`, `ExpansionRecord` |
| **Evidence** | `Evidence`, `EvidenceLink` |
| **Assessment** | `AssessmentResult`, `KnowledgeNodeMastery` |
| **Discovery** | `DiscoverySession`, `SelfAssessmentMismatch` |
| **Mentor Interaction** | `MentorSession` |
| **Recommendation** | `RecommendationProposal` |
| **Learning Session** | `LearningSession`, `SubSession`, `LearningSessionTransition` *(Supporting Persistence Entity)* |
| **Traceability** (cross-cutting, không phải Core Domain) | `TraceLink` |

**Lưu ý:** module `Traceability` không tương ứng 1 domain nghiệp vụ — nó tồn tại vì `TraceLink` là hạ tầng cross-cutting ghi bởi nhiều domain khác (Assessment, Recommendation, Knowledge), không phải vì có 1 "Traceability Domain" mới phát sinh ngoài Decision Log.

---

## 4. Index Strategy (Conceptual)

**Chỉ mô tả Query Pattern/Read Model/Hot Path — không có tên index, không có cột cụ thể, không có loại index (clustered/non-clustered/columnstore...).**

| # | Query Pattern | Entity liên quan | Đặc điểm |
|---|---|---|---|
| 1 | "Mức độ hiểu hiện tại của Learner về 1 KnowledgeNode" — point lookup theo cặp Learner×KnowledgeNode | `KnowledgeNodeMastery` | Hot path đọc nhiều nhất trong hệ thống — phục vụ trực tiếp mọi quyết định runtime (Roadmap rendering, Recommendation, Discovery) |
| 2 | "Toàn bộ AssessmentResult của 1 Learner cho 1 KnowledgeNode, theo thời gian" | `AssessmentResult` | Read pattern thời gian (time-ordered) — hưởng lợi tự nhiên từ ULID sortable theo thời gian, phục vụ Explainability drill-down |
| 3 | "Cây RoadmapNode của 1 Roadmap" | `RoadmapNode` | Đọc theo `roadmap_id`, dựng cây cha-con — truy vấn đệ quy (Recursive CTE), tần suất đọc cao mỗi khi hiển thị lộ trình |
| 4 | "Traversal/reachability trong Knowledge Graph" (DAG) | `KnowledgeEdge` | Đọc 2 chiều (`from_knowledge_node_id` và `to_knowledge_node_id`) — truy vấn đệ quy (Recursive CTE, theo DECISION-039), tần suất phụ thuộc mật độ graph |
| 5 | "Mọi thứ trace tới/từ 1 entity X" (drill-down explainability) | `TraceLink` | Đọc 2 chiều (theo `source`, theo `target`) — phục vụ Memory/Learning Profile khi Learner hỏi "vì sao" |
| 6 | "Đề xuất Recommendation đang chờ xử lý của 1 Learner" | `RecommendationProposal` | Đọc theo `learner_id` + trạng thái xử lý (proposed/confirmed/ignored) — read model cho Mentor Interaction runtime |
| 7 | "LearningSession/SubSession đang active của 1 Learner" | `LearningSession`, `SubSession` | Đọc theo `learner_id` + trạng thái — hot path mở mỗi khi Learner vào hệ thống |
| 8 | "Lịch sử ApprovalRecord của 1 Roadmap" | `ApprovalRecord` | Đọc theo `roadmap_id`, time-ordered — phục vụ audit Roadmap Governance |
| 9 | "Toàn bộ Goal/AssessmentResult/DiscoverySession của 1 Learner" (Memory/Learning Profile) | `Goal`, `AssessmentResult`, `DiscoverySession` | Read Model tổng hợp xuyên nhiều bảng theo `learner_id` — không có 1 entity ghi riêng, nên đọc luôn là join/aggregate xuyên domain; 🔶 có thể cần cache/materialized view sau này nếu tính trực tiếp quá chậm (theo PersistenceArchitecture.md mục 3.6, chưa quyết định) |

**Không mô tả thêm vì ngoài phạm vi Step 4A** (theo yêu cầu): loại index, cột cụ thể trong index, thứ tự cột, filtered/covering index, columnstore cho analytics — để Step 4B/Infrastructure quyết định dựa trên các Hot Path đã liệt kê ở trên.

---

## 5. Liên kết ngược

[LogicalDatabaseModel.md](LogicalDatabaseModel.md), [PersistenceArchitecture.md](PersistenceArchitecture.md), [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md), [PHYSICAL_DESIGN_READINESS.md](PHYSICAL_DESIGN_READINESS.md), [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md), [PLATFORM_ALIGNMENT_REVIEW.md](PLATFORM_ALIGNMENT_REVIEW.md), [DECISION-038-Traceability-Model](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-039-Knowledge-Graph-Persistence](../11_Decisions/DECISION-039-Knowledge-Graph-Persistence.md), [DECISION-040-Physical-Database-Design-Split](../11_Decisions/DECISION-040-Physical-Database-Design-Split.md), [DECISION-042](../11_Decisions/DECISION-042-Database-Naming-Convention-Alignment.md)..[045](../11_Decisions/DECISION-045-Temporal-Strategy.md).

**Đánh giá Readiness cho DDL: xem [DatabaseBlueprintReview.md](DatabaseBlueprintReview.md) (Step 4A) và [PLATFORM_ALIGNMENT_REVIEW.md](PLATFORM_ALIGNMENT_REVIEW.md) (Pre-DDL Platform Alignment, kết luận cuối: READY_FOR_DDL). Vẫn chưa viết SQL/`CREATE TABLE`/cột/index/constraint — Step 4B (DDL Generation) chưa bắt đầu.**
