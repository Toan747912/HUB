# DDL Round 2 Design — Knowledge + Evidence + Assessment + Traceability

> Database Design Phase — **Step 4B, Round 2**. Áp dụng [DatabaseNamingConvention.md](DatabaseNamingConvention.md), DECISION-042..047, và [DatabaseBlueprint.md](DatabaseBlueprint.md) (Step 4A). Nguồn entity: [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 1, [DECISION-015](../11_Decisions/DECISION-015-Knowledge-Engine.md)..[038](../11_Decisions/DECISION-038-Traceability-Model.md).
>
> **Thiết kế DDL ở mức mô tả — KHÔNG có `CREATE TABLE`, không SQL, không Migration, không API/Frontend.**

## 0. Reconciliation — đối chiếu phạm vi yêu cầu với Domain Architecture đã khóa

Trước khi thiết kế, 3 điểm trong danh sách bảng được giao **không khớp trực tiếp** với Domain Architecture/Logical Database Model đã khóa — xử lý theo nguyên tắc "không tự quyết định, không tự bịa, báo cáo rõ" đã áp dụng nhất quán xuyên Database Design Phase.

### 0.1 `positive_evidence` / `negative_evidence` — KHÔNG tạo 2 bảng riêng

**Phát hiện:** [DECISION-022-Evidence-KnowledgeNode-M2M](../11_Decisions/DECISION-022-Evidence-KnowledgeNode-M2M.md) (Round 3) đã **chính thức loại bỏ** khái niệm "Positive/Negative Evidence" như 1 thuộc tính toàn cục của `Evidence` — Round 1/2 từng có ý tưởng đó, nhưng bị thay bằng **`direction`/`stance` ở cấp `EvidenceLink`** (mỗi link riêng biệt có thể `support` hoặc `refute`), vì 1 Evidence có thể **đồng thời** support 1 KnowledgeNode và refute 1 KnowledgeNode khác (ví dụ minh họa trong [EvidenceModel.md](../../AI/EvidenceEngine/EvidenceModel.md): bài nộp "Upload Video" support `HTTP` nhưng refute `Multipart Form`). [PositiveEvidence.md](../../AI/EvidenceEngine/PositiveEvidence.md)/[NegativeEvidence.md](../../AI/EvidenceEngine/NegativeEvidence.md) xác nhận lại: đây giờ là **khái niệm mô tả** (label cho `direction = support`/`refute`), không phải entity riêng.

**Quyết định thiết kế Round 2:** tạo `evidence` + `evidence_link` (đúng 2 entity đã khóa ở Logical Database Model) — **không tạo bảng `positive_evidence`/`negative_evidence`**. "Positive Evidence"/"Negative Evidence" trong yêu cầu Round 2 ánh xạ thành **giá trị của cột `evidence_link.stance`** (`support` = Positive, `refute` = Negative) — xem mục 1.4. Tạo 2 bảng riêng sẽ **vi phạm trực tiếp DECISION-022** (hồi sinh field `type` cấp Evidence mà Decision Log đã bác bỏ) — không thực hiện.

### 0.2 `assessment` — KHÔNG tạo bảng wrapper riêng ngoài `assessment_result`

**Phát hiện:** [AssessmentDomain.md](../03_Domain_Model/AssessmentDomain.md) mục "Aggregate Roots thuộc domain này" chỉ liệt kê 2 entity: `KnowledgeNodeMastery` và `AssessmentResult`. Không có entity "Assessment" nào bao bọc nhiều `AssessmentResult` (ví dụ 1 "kỳ đánh giá" gồm nhiều `AssessmentResult` con) trong Domain Architecture đã khóa.

**Quyết định thiết kế Round 2:** chỉ thiết kế `assessment_result` (entity đã khóa). Không tạo `assessment` — tự thêm 1 entity wrapper không có cơ sở Domain Architecture sẽ lặp lại đúng rủi ro đã được xử lý cẩn trọng ở [DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md) (Round 1) — lần này không tự thêm trước, chỉ ghi nhận làm Open Question (xem mục 5 Risks) để Founder/ChatGPT xác nhận có cần khái niệm này không, trước khi tạo.

### 0.3 `knowledge_node_mastery` — ghi nhận đúng write-owner (Assessment Domain, không phải Knowledge Graph Domain)

**Phát hiện:** Yêu cầu Round 2 nhóm `knowledge_node_mastery` vào "KNOWLEDGE MODULE" — nhưng theo [DECISION-026-Assessment-Core-Domain](../11_Decisions/DECISION-026-Assessment-Core-Domain.md), write-owner của `KnowledgeNodeMastery` là **Assessment Domain**, không phải Knowledge Graph Domain (khớp với [DatabaseBlueprint.md](DatabaseBlueprint.md) mục 3, nơi `KnowledgeNodeMastery` đã được nhóm vào module **Assessment**, không phải **Knowledge**).

**Quyết định thiết kế Round 2:** vẫn thiết kế `knowledge_node_mastery` trong tài liệu này (đúng theo bố cục Round được giao), nhưng **giữ nguyên write-ownership = Assessment Domain** ở mọi nơi liên quan (Audit Strategy, Boundary) — đây chỉ là khác biệt về **cách nhóm bảng trong 1 file tài liệu**, không phải khác biệt về sở hữu dữ liệu. Không có Ownership Conflict phát sinh.

---

## 1. Table Specifications

### 1.1 `knowledge_node` (Knowledge Module)

**Purpose:** 1 đơn vị tri thức chuẩn của hệ thống (ví dụ JWT, HTTP, Validation) — dùng chung, không thuộc riêng 1 Roadmap/Learner ([DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md)).

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `knowledge_node_id` | `uuid` | NOT NULL | `gen_random_uuid()` | **PK** |
| `title` | `text` | NOT NULL | — | Tên node (ví dụ "JWT", "Multipart Form") |
| `description` | `text` | NULL | — | Nội dung mô tả — 🔶 có thể sửa được không, có cần version? Open Question #4 kế thừa, chưa chốt |
| `domain_category` | `text` | NOT NULL | — | ∈ {`programming`,`ai`,`design`,`language`,`marketing`,`business`,`career_skill`,...} — **danh sách mở**, [DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md) mục 4 — 🔶 chưa chốt phạm vi MVP (Open Question câu 3) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `updated_by_actor_type` | `text` | NOT NULL | — | Audit |
| `updated_by_actor_id` | `uuid` | NULL | — | Audit |

**PK:** `knowledge_node_id`. **FK:** không có (gốc của graph). **Unique:** không có — 🔶 không có dedup rule cho node trùng ngữ nghĩa (kế thừa từ [DatabaseBlueprint.md](DatabaseBlueprint.md) mục 1.6).

**Check Constraints:**
- `ck_knowledge_node_domain_category` — **đề xuất, không khóa cứng** (danh sách còn mở) — khuyến nghị tạm dùng CHECK với danh sách khởi điểm trên, dễ `ALTER` mở rộng; **cân nhắc không CHECK ở Round 2 nếu Founder muốn giữ hoàn toàn mở cho tới khi MVP domain scope được xác nhận**
- `ck_knowledge_node_created_by_actor_type` / `ck_knowledge_node_updated_by_actor_type` — enum đóng (`learner`/`backend_core`/`ai_service`)

**Versioning:** Không áp dụng (DECISION-044 không liệt kê `knowledge_node` vào nhóm cần `version_number`) — 🔶 nếu Open Question #4 (sửa nội dung có cần version) được xác nhận "có", cần bổ sung `version_number` ở Round sau.

**Audit Strategy:** đầy đủ 2 nhóm (Current State Snapshot).

**History Strategy:** `history.knowledge_node` — trigger-maintained (DECISION-045, nhóm "không có companion log").

**Retention Strategy:** Vĩnh viễn — không bao giờ xóa (dùng chung, tái sử dụng xuyên Learner/Roadmap).

---

### 1.2 `knowledge_edge` (Knowledge Module)

**Purpose:** 1 cạnh có hướng trong Knowledge Graph DAG (multi-parent, multi relation-type, [DECISION-025](../11_Decisions/DECISION-025-Knowledge-Graph-DAG.md)).

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `knowledge_edge_id` | `uuid` | NOT NULL | sinh ở Application Layer (ULID-style) | **PK** |
| `from_knowledge_node_id` | `uuid` | NOT NULL | — | FK → `knowledge_node` |
| `to_knowledge_node_id` | `uuid` | NOT NULL | — | FK → `knowledge_node` |
| `relation_type` | `text` | NOT NULL | — | `expands_to` / `prerequisite_of` / `related_to` — **danh sách khởi điểm, KHÔNG đầy đủ** ([KnowledgeGraphModel.md](../../AI/KnowledgeEngine/KnowledgeGraphModel.md), Open Question #18 vẫn mở) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |

**Không có `updated_at`/`updated_by_*`** — append-only, immutable (DECISION-025/029 — không sửa/xóa cạnh, chỉ thêm cạnh mới).

**PK:** `knowledge_edge_id`.

**FK:**
- `from_knowledge_node_id → knowledge_node(knowledge_node_id)` — `ON DELETE RESTRICT` (lý thuyết — `knowledge_node` không bao giờ xóa, nhưng RESTRICT là quy tắc đúng nếu tình huống xảy ra)
- `to_knowledge_node_id → knowledge_node(knowledge_node_id)` — `ON DELETE RESTRICT`

**Unique Constraints:** `uq_knowledge_edge_from_to_relation_type` — `UNIQUE (from_knowledge_node_id, to_knowledge_node_id, relation_type)` — **đề xuất, chưa khóa cứng** ([NamingIssueResolution.md](NamingIssueResolution.md) mục 3 đã từng nêu khuyến nghị này) — ngăn edge trùng hoàn toàn, nhưng triết lý append-only cho phép thêm cạnh dù trùng nếu cần — cần Founder/ChatGPT xác nhận.

**Check Constraints:**
- `ck_knowledge_edge_no_self_loop` — `from_knowledge_node_id <> to_knowledge_node_id` (1 node không tự trỏ tới chính nó — bất biến DAG cơ bản nhất, **không thay thế** cycle detection đầy đủ, chỉ chặn trường hợp tầm thường nhất ở tầng DB)
- `ck_knowledge_edge_relation_type` — **đề xuất, danh sách mở** — cùng lưu ý như `ck_knowledge_node_domain_category`
- `ck_knowledge_edge_created_by_actor_type` — enum đóng

**Versioning:** Không áp dụng (append-only).

**Audit Strategy:** chỉ nhóm created (append-only).

**History Strategy:** Không áp dụng — append-only tự là lịch sử.

**Retention Strategy:** Vĩnh viễn — không xóa (Risk vận hành đã biết: tăng nhanh khi graph mở rộng, chấp nhận theo DECISION-029).

**🔑 Xác nhận quan trọng (xem mục 3 — Knowledge Graph Validation):** bảng này **không** có cột `parent_id`/`depth`/closure-table nào — đúng quyết định DECISION-029 (Runtime Reachability Check, không Closure Table) và DECISION-039 (bảng quan hệ + Recursive CTE, không Graph Extensions).

---

### 1.3 `knowledge_node_mastery` (write-owner: Assessment Domain — xem mục 0.3)

**Purpose:** Trạng thái "tin hiện tại" về mức độ hiểu của 1 Learner với 1 KnowledgeNode — Remember/Explain(Level 2)/Apply/Teach.

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `knowledge_node_mastery_id` | `uuid` | NOT NULL | `gen_random_uuid()` | **PK** |
| `learner_id` | `uuid` | NOT NULL | — | FK → `learner(id)` |
| `knowledge_node_id` | `uuid` | NOT NULL | — | FK → `knowledge_node` |
| `remember_level` | `boolean` | NOT NULL | `false` | Đạt/chưa đạt — binary, [MasteryModel.md](../../AI/KnowledgeEngine/MasteryModel.md) |
| `explain_level` | `boolean` | NOT NULL | `false` | Mastery **Level 2** — binary. **Tên cột tách rõ khỏi `teach_explain_score`** (mục 1.7) theo giải pháp Naming Issue #1 đã khóa ([NamingIssueResolution.md](NamingIssueResolution.md) mục 1) |
| `apply_level` | `boolean` | NOT NULL | `false` | Đạt/chưa đạt — binary |
| `teach_score` | `numeric(4,3)` | NOT NULL | `0` | Composite weighted score (DECISION-020) — **không** đạt/chưa đạt |
| `teach_capability_scores` | `jsonb` | NOT NULL | `'{}'` | Breakdown 5 sub-capability (`teach_explain`, `teach_simplify`, `teach_guide`, `teach_review`, `teach_transfer_knowledge`) — 🔶 dùng `jsonb` vì `capability_weight` cụ thể từng sub-capability **chưa chốt** (Gap 5, [DECISION-020](../11_Decisions/DECISION-020-Teach-Composite-Capability.md) Consequences); cấu trúc cột phẳng (5 cột riêng) là phương án khác, chưa chọn — xem Risk |
| `confidence` | `numeric(3,2)` | NULL | — | Độ tin cậy đánh giá AI — 🔶 kiểu dữ liệu/thang đo chưa chốt chính thức (Gap 5), `numeric(3,2)` (0.00–1.00) là **suy luận hợp lý của Claude**, cần xác nhận |
| `last_assessment_result_id` | `uuid` | **NOT NULL** | — | FK → `assessment_result` — **bắt buộc non-nullable** theo yêu cầu Explainability ([DatabaseBlueprint.md](DatabaseBlueprint.md) mục 1.11: "liên kết ngược bắt buộc, non-nullable") |
| `version_number` | `bigint` | NOT NULL | `1` | Versioning — **bắt buộc** (DECISION-044, rủi ro ghi đồng thời cao nhất đã xác định) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit — thực tế luôn `ai_service`/`backend_core` (Assessment Domain), không phải `learner` |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `updated_by_actor_type` | `text` | NOT NULL | — | Audit |
| `updated_by_actor_id` | `uuid` | NULL | — | Audit |

**PK:** `knowledge_node_mastery_id`.

**FK:**
- `learner_id → learner(id)` — `ON DELETE RESTRICT`
- `knowledge_node_id → knowledge_node(knowledge_node_id)` — `ON DELETE RESTRICT` (**bắt buộc RESTRICT, không CASCADE/SET NULL** — xem mục 4, Delete Rule Review)
- `last_assessment_result_id → assessment_result(assessment_result_id)` — `ON DELETE RESTRICT` (bảo vệ Explainability — không bao giờ được mất liên kết ngược)

**Unique Constraints:** `uq_knowledge_node_mastery_learner_id_knowledge_node_id` — `UNIQUE (learner_id, knowledge_node_id)` — khóa cứng ([LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 2).

**Check Constraints:**
- `ck_knowledge_node_mastery_teach_score_range` — `teach_score >= 0 AND teach_score <= 1`
- `ck_knowledge_node_mastery_confidence_range` — `confidence IS NULL OR (confidence >= 0 AND confidence <= 1)`
- `ck_knowledge_node_mastery_created_by_actor_type` / `ck_knowledge_node_mastery_updated_by_actor_type` — enum đóng

**Versioning:** **`version_number`, bắt buộc** ([DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md)) — trigger-incremented `BEFORE UPDATE`.

**Audit Strategy:** đầy đủ 2 nhóm — **nhưng không tự đủ để audit nếu đứng riêng** ([DatabaseBlueprint.md](DatabaseBlueprint.md) mục 1.11) — phải join `last_assessment_result_id`.

**History Strategy:** **Không cần History Table** — companion log là `assessment_result` (DECISION-045).

**Retention Strategy:** Chỉ giữ giá trị mới nhất — lịch sử đầy đủ đã có ở `assessment_result`.

---

### 1.4 `evidence` (Evidence Module)

**Purpose:** 1 bằng chứng học tập thô (bài làm, câu trả lời, tương tác) — nguồn cho `evidence_link`/`assessment_result`.

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `evidence_id` | `uuid` | NOT NULL | sinh ở Application Layer (ULID-style) | **PK** |
| `learner_id` | `uuid` | NOT NULL | — | FK → `learner(id)` |
| `mentor_session_id` | `uuid` | NULL | — | **Cột giữ chỗ, chưa có FK** — `mentor_session` thuộc Mentor Interaction Module, ngoài phạm vi Round 2 (cùng cách xử lý forward dependency như Round 1); 🔶 bắt buộc hay tùy chọn vẫn là Open Question #2 kế thừa |
| `source_type` | `text` | NOT NULL | — | `mentor_session` / `submission` / `discovery_session` — nguồn sinh evidence ([EvidenceModel.md](../../AI/EvidenceEngine/EvidenceModel.md)) |
| `raw_reference` | `jsonb` | NOT NULL | — | Nội dung thô (câu trả lời/code/bài nộp) — dùng `jsonb` vì nội dung có thể bán cấu trúc, khác nhau theo `source_type` |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |

**Không có `updated_at`/`updated_by_*`** — immutable hoàn toàn ([EvidenceModel.md](../../AI/EvidenceEngine/EvidenceModel.md): "không sửa/xóa, chỉ thêm mới").

**PK:** `evidence_id`.

**FK:**
- `learner_id → learner(id)` — `ON DELETE RESTRICT`
- `mentor_session_id` — chưa có FK (forward dependency)

**Unique:** không có.

**Check Constraints:**
- `ck_evidence_source_type` — `source_type IN ('mentor_session','submission','discovery_session')` — đề xuất, có thể cần mở rộng
- `ck_evidence_created_by_actor_type` — enum đóng

**Versioning:** Không áp dụng (immutable).

**Audit Strategy:** chỉ nhóm created.

**History Strategy:** Không áp dụng — append-only.

**Retention Strategy:** Vĩnh viễn — xóa sẽ phá vỡ `trace_link` của mọi `assessment_result` tham chiếu nó.

---

### 1.5 `evidence_link` (Evidence Module) — *thay cho `positive_evidence`/`negative_evidence`, xem mục 0.1*

**Purpose:** Liên kết 1 `evidence` tới 1 `knowledge_node` cụ thể, mang chiều support/refute riêng cho từng liên kết (DECISION-022).

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `evidence_link_id` | `uuid` | NOT NULL | sinh ở Application Layer (ULID-style) | **PK** |
| `evidence_id` | `uuid` | NOT NULL | — | FK → `evidence` |
| `knowledge_node_id` | `uuid` | NOT NULL | — | FK → `knowledge_node` |
| `stance` | `text` | NOT NULL | — | `support` (= "Positive Evidence") / `refute` (= "Negative Evidence") — **không dùng tên cột `type`**, theo giải pháp Naming Issue #5 đã khóa ([NamingIssueResolution.md](NamingIssueResolution.md) mục 5) |
| `evidence_weight` | `numeric(4,3)` | NOT NULL | — | Trọng số quyết định mức ảnh hưởng Knowledge Regression (DECISION-021) — 🔶 công thức/kiểu dữ liệu chính thức chưa chốt (Gap 5), `numeric(4,3)` là suy luận hợp lý |
| `target_mastery_dimension` | `text` | NOT NULL | — | `remember` / `explain_level` / `apply` / `teach_explain` / `teach_simplify` / `teach_guide` / `teach_review` / `teach_transfer_knowledge` — cấp độ/sub-capability bị ảnh hưởng |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |

**Không có `updated_at`/`updated_by_*`** — immutable, append-only (con trong Aggregate `Evidence`).

**PK:** `evidence_link_id`.

**FK:**
- `evidence_id → evidence(evidence_id)` — `ON DELETE CASCADE` (con trong cùng Aggregate `Evidence`, Boundary 5 — Cascade chỉ trong phạm vi Aggregate)
- `knowledge_node_id → knowledge_node(knowledge_node_id)` — `ON DELETE RESTRICT` (**bắt buộc** — xem mục 4, Delete Rule Review)

**Unique Constraints:** 🔶 đề xuất `uq_evidence_link_evidence_id_knowledge_node_id_stance` — `UNIQUE (evidence_id, knowledge_node_id, stance)` (1 Evidence có thể support/refute cùng 1 node qua nhiều link nếu khác `stance`, nhưng không nên có 2 link cùng `evidence_id`+`knowledge_node_id`+`stance` trùng lặp) — kế thừa khuyến nghị từ [DatabaseBlueprint.md](DatabaseBlueprint.md) mục 1.10, chưa khóa cứng.

**Check Constraints:**
- `ck_evidence_link_stance` — `stance IN ('support','refute')`
- `ck_evidence_link_evidence_weight_range` — 🔶 `evidence_weight >= 0` (giới hạn trên chưa rõ — công thức chưa chốt, tạm chỉ chặn âm)
- `ck_evidence_link_target_mastery_dimension` — danh sách 8 giá trị cố định ở trên
- `ck_evidence_link_created_by_actor_type` — enum đóng

**Versioning:** Không áp dụng.

**Audit Strategy:** chỉ nhóm created.

**History Strategy:** Không áp dụng — append-only (con trong Aggregate `Evidence`, đã immutable).

**Retention Strategy:** Vĩnh viễn.

---

### 1.6 `assessment_result` (Assessment Module — xem mục 0.2: không có bảng `assessment` riêng)

**Purpose:** 1 kết quả đánh giá cụ thể — artifact explainability chính của hệ thống, đủ 8 trường theo [DECISION-030](../11_Decisions/DECISION-030-Assessment-Result-Granularity.md).

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `assessment_result_id` | `uuid` | NOT NULL | sinh ở Application Layer (ULID-style) | **PK** |
| `learner_id` | `uuid` | NOT NULL | — | FK → `learner(id)` |
| `knowledge_node_id` | `uuid` | NOT NULL | — | FK → `knowledge_node` — trường 1/8 bắt buộc theo DECISION-030 |
| `remember_level` | `boolean` | NOT NULL | — | Trường 2/8 |
| `explain_level` | `boolean` | NOT NULL | — | Trường 3/8 — **Mastery Level 2**, tên cột tách rõ khỏi `teach_explain_score` (Naming Issue #1) |
| `apply_level` | `boolean` | NOT NULL | — | Trường 4/8 |
| `teach_score` | `numeric(4,3)` | NOT NULL | — | Trường 5/8 — composite (DECISION-020) |
| `teach_capability_scores` | `jsonb` | NOT NULL | `'{}'` | Breakdown 5 sub-capability tại thời điểm đánh giá này — cùng lý do `jsonb` như mục 1.3 |
| `confidence` | `numeric(3,2)` | NOT NULL | — | Trường 6/8 — độ tin cậy của **chính đánh giá AI**, không phải mức hiểu của Learner |
| `reasoning` | `text` | NOT NULL | — | Trường 8/8 — giải thích ngôn ngữ tự nhiên, **bắt buộc** (Explainability First) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit — thực tế luôn `ai_service` |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |

**Trường 7/8 ("Evidence References") — KHÔNG là cột trên bảng này** — thực hiện qua `trace_link` (mục 1.7), theo [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md). Mỗi `assessment_result` phải có **≥1 row `trace_link`** với `source_type = 'assessment_result'`, `source_id = assessment_result_id`, `target_type = 'evidence'` (hoặc tương đương) — ràng buộc này **không thể** biểu diễn bằng CHECK constraint trên chính bảng `assessment_result` (vì phụ thuộc dữ liệu ở bảng khác) — Application Layer phải đảm bảo tạo `trace_link` **cùng giao dịch** với `assessment_result` (xem mục 3, Traceability Validation).

**Không có `updated_at`/`updated_by_*`** — immutable, append-only.

**PK:** `assessment_result_id`.

**FK:**
- `learner_id → learner(id)` — `ON DELETE RESTRICT`
- `knowledge_node_id → knowledge_node(knowledge_node_id)` — `ON DELETE RESTRICT` (**bắt buộc** — xem mục 4)

**Unique:** không có — nhiều `assessment_result` / Learner×KnowledgeNode theo thời gian là bình thường (cardinality chính xác vẫn Open Question #20 kế thừa).

**Check Constraints:**
- `ck_assessment_result_teach_score_range` — `teach_score >= 0 AND teach_score <= 1`
- `ck_assessment_result_confidence_range` — `confidence >= 0 AND confidence <= 1`
- `ck_assessment_result_reasoning_not_empty` — `length(trim(reasoning)) > 0` (Explainability First — không cho phép `reasoning` rỗng dù `NOT NULL`)
- `ck_assessment_result_created_by_actor_type` — enum đóng

**Versioning:** Không áp dụng (immutable).

**Audit Strategy:** chỉ nhóm created — **chính nó là artifact explainability**, không cần audit log riêng.

**History Strategy:** Không áp dụng — append-only.

**Retention Strategy:** Vĩnh viễn.

---

### 1.7 `trace_link` (Traceability Module)

**Purpose:** Quan hệ truy vết có hướng giữa 1 entity "kết quả/quyết định" và 1 entity "nguồn gốc" — hạ tầng cross-cutting cho Explainability First ([DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md)).

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `trace_link_id` | `uuid` | NOT NULL | sinh ở Application Layer (ULID-style) | **PK** |
| `source_type` | `text` | NOT NULL | — | `assessment_result` / `recommendation_proposal` / `local_expansion` — enum đóng ([PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 6 Scope) |
| `source_id` | `uuid` | NOT NULL | — | Diễn giải theo `source_type` — **không có FK vật lý** (bản chất đa hình, đúng quyết định DECISION-038 — không Polymorphic FK rải trên entity nghiệp vụ) |
| `target_type` | `text` | NOT NULL | — | `evidence` / `assessment_result` / `discovery_session` — enum đóng |
| `target_id` | `uuid` | NOT NULL | — | Diễn giải theo `target_type` — không có FK vật lý |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit — domain tạo entity "kết quả" tự ghi `trace_link` của chính nó, cùng giao dịch |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |

**Không có `updated_at`/`updated_by_*`** — immutable, vĩnh viễn (DECISION-038).

**PK:** `trace_link_id`.

**FK:** **Không có FK vật lý nào** trên `source_id`/`target_id` — đây là **bản chất thiết kế**, không phải thiếu sót (đa hình, mỗi giá trị `*_type` trỏ tới 1 bảng khác nhau, PostgreSQL không hỗ trợ FK điều kiện theo giá trị cột khác). **Hệ quả quan trọng:** PostgreSQL **không thể tự đảm bảo referential integrity** cho `source_id`/`target_id` — toàn vẹn dữ liệu ở đây phụ thuộc **hoàn toàn vào Application Layer** ghi đúng. Đây là đánh đổi đã được chấp nhận khi chọn `TraceLink` thay Polymorphic FK ở DECISION-038 (mục Reasoning: "khó đảm bảo toàn vẹn tham chiếu bằng constraint thông thường" được liệt kê như nhược điểm *của phương án bị loại*, không phải của `TraceLink` — nhưng `TraceLink` cũng **không giải quyết được** nhược điểm này, chỉ tập trung nó vào 1 nơi duy nhất thay vì rải nhiều nơi).

**Unique Constraints:** 🔶 đề xuất `uq_trace_link_source_target` — `UNIQUE (source_type, source_id, target_type, target_id)` — tránh trùng lặp hoàn toàn, chưa khóa cứng (kế thừa khuyến nghị từ [NamingIssueResolution.md](NamingIssueResolution.md) mục 4 — tài liệu đó để ngỏ, Round 2 nhắc lại).

**Check Constraints:**
- `ck_trace_link_source_type` — `source_type IN ('assessment_result','recommendation_proposal','local_expansion')`
- `ck_trace_link_target_type` — `target_type IN ('evidence','assessment_result','discovery_session')`
- `ck_trace_link_created_by_actor_type` — enum đóng

**Versioning:** Không áp dụng.

**Audit Strategy:** chỉ nhóm created — chính nó là cơ chế audit cho domain khác.

**History Strategy:** Không áp dụng — append-only.

**Retention Strategy:** Vĩnh viễn.

---

## 2. Constraint Specifications (tổng hợp)

| Bảng | Unique | Check | FK quan trọng |
|---|---|---|---|
| `knowledge_node` | — | `ck_knowledge_node_domain_category` *(đề xuất)*, `ck_*_actor_type` ×2 | — |
| `knowledge_edge` | `uq_knowledge_edge_from_to_relation_type` *(đề xuất)* | `ck_knowledge_edge_no_self_loop`, `ck_knowledge_edge_relation_type` *(đề xuất)*, `ck_*_actor_type` | `from`/`to_knowledge_node_id` `ON DELETE RESTRICT` |
| `knowledge_node_mastery` | `uq_knowledge_node_mastery_learner_id_knowledge_node_id` | `ck_*_teach_score_range`, `ck_*_confidence_range`, `ck_*_actor_type` ×2 | `knowledge_node_id`/`last_assessment_result_id` `ON DELETE RESTRICT` |
| `evidence` | — | `ck_evidence_source_type`, `ck_*_actor_type` | `learner_id` `ON DELETE RESTRICT` |
| `evidence_link` | `uq_evidence_link_evidence_id_knowledge_node_id_stance` *(đề xuất)* | `ck_evidence_link_stance`, `ck_*_weight_range`, `ck_*_target_mastery_dimension`, `ck_*_actor_type` | `evidence_id` `ON DELETE CASCADE`; `knowledge_node_id` `ON DELETE RESTRICT` |
| `assessment_result` | — | `ck_*_teach_score_range`, `ck_*_confidence_range`, `ck_*_reasoning_not_empty`, `ck_*_actor_type` | `knowledge_node_id` `ON DELETE RESTRICT` |
| `trace_link` | `uq_trace_link_source_target` *(đề xuất)* | `ck_trace_link_source_type`, `ck_trace_link_target_type`, `ck_*_actor_type` | Không có FK vật lý (đa hình, cố ý) |

---

## 3. Relationship Validation

| Quan hệ đã chốt ([LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 2) | Thiết kế Round 2 | Khớp? |
|---|---|---|
| `KnowledgeNode` — `KnowledgeNode` (qua `KnowledgeEdge`) | `knowledge_edge.from/to_knowledge_node_id → knowledge_node`, M:N | ✅ |
| `Evidence` — `EvidenceLink` (1 — *) | `evidence_link.evidence_id → evidence`, `ON DELETE CASCADE` | ✅ |
| `EvidenceLink` — `KnowledgeNode` (* — 1) | `evidence_link.knowledge_node_id → knowledge_node` | ✅ |
| `KnowledgeNodeMastery` — `Learner` (* — 1) | `knowledge_node_mastery.learner_id → learner` | ✅ |
| `KnowledgeNodeMastery` — `KnowledgeNode` (* — 1, unique cặp) | `uq_knowledge_node_mastery_learner_id_knowledge_node_id` | ✅ |
| `AssessmentResult` — `KnowledgeNode` (* — 1) | `assessment_result.knowledge_node_id → knowledge_node` | ✅ |
| `AssessmentResult` — `Evidence`/`EvidenceLink` (Evidence References, qua `TraceLink`) | `trace_link` với `source_type='assessment_result'` | ✅ (đúng theo DECISION-038, không FK trực tiếp) |
| `AssessmentResult` → `KnowledgeNodeMastery` (nhân quả, không FK lưu trữ, DECISION-035) | `knowledge_node_mastery.last_assessment_result_id` là FK **ngược** (Mastery trỏ tới AssessmentResult, không phải chiều kia) — đúng bản chất "ghi trực tiếp" mà DECISION-035 mô tả | ✅ |

**Không phát hiện sai lệch cardinality nào.** Ownership đối chiếu: `knowledge_node`/`knowledge_edge` write-owner Knowledge Graph Domain; `evidence`/`evidence_link` write-owner Evidence Domain; `knowledge_node_mastery`/`assessment_result` write-owner Assessment Domain (mục 0.3); `trace_link` không thuộc Core Domain nào (hạ tầng cross-cutting, DECISION-038) — khớp [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 5, không Ownership Conflict mới.

---

## 4. RLS Impact Notes (Supabase)

| Bảng | Boundary RLS đề xuất | Đặc điểm |
|---|---|---|
| `knowledge_node` | **Không theo `learner_id`** — đọc công khai cho mọi Learner đã đăng nhập (`SELECT` cho `authenticated`), ghi chỉ qua service role (AI Service/Backend) | Khác hẳn pattern Round 1 — đây là **shared/global resource**, không phải dữ liệu riêng của 1 Learner |
| `knowledge_edge` | Cùng pattern — đọc công khai, ghi qua service role | — |
| `knowledge_node_mastery` | `learner_id = auth.uid()` | Trực tiếp, 0 hop |
| `evidence` | `learner_id = auth.uid()` | Trực tiếp, 0 hop |
| `evidence_link` | qua `evidence.learner_id = auth.uid()` | 1 hop |
| `assessment_result` | `learner_id = auth.uid()` | Trực tiếp, 0 hop |
| `trace_link` | **🔶 Khó thiết kế RLS đơn giản** — không có `learner_id` (đa hình `source_type`/`target_type`), join path khác nhau theo từng loại (`assessment_result` → `learner_id` trực tiếp; `discovery_session` → ngoài phạm vi Round 2; `recommendation_proposal` → ngoài phạm vi Round 2) — **không thể viết 1 policy `USING` đơn giản dùng chung cho mọi row** | Cần 1 function PL/pgSQL kiểm tra theo `*_type` (ngoài phạm vi "không SQL" của tài liệu này) hoặc — khuyến nghị thực tế hơn — **toàn bộ truy cập `trace_link` đi qua Backend (service role), không expose trực tiếp qua RLS cho client** |

**Phát hiện quan trọng (khác Round 1):** Round 2 là round đầu tiên có **shared/global table** (`knowledge_node`/`knowledge_edge`) — RLS ở đây không phải "row ownership" mà là "role-based access" (mọi Learner đọc, chỉ AI Service/Backend viết). Cần phân biệt rõ 2 loại RLS policy khi Step sau viết policy thật.

---

## 5. Risks

| # | Rủi ro | Mức độ | Ghi chú |
|---|---|---|---|
| 1 | **`positive_evidence`/`negative_evidence` không được tạo thành bảng riêng** (mục 0.1) — nếu Founder/ChatGPT thực sự muốn 2 bảng vật lý riêng (khác với map vào `evidence_link.stance`), đây là **mở lại DECISION-022**, không phải quyết định Database Design có thể tự xử lý | **Medium-High** | Cần xác nhận rõ trước SQL Generation — nếu giữ nguyên ý DECISION-022 (khả năng cao), không cần hành động gì thêm |
| 2 | **`assessment` (bảng wrapper) không được tạo** (mục 0.2) — nếu Founder/ChatGPT có ý định thật về 1 entity "kỳ đánh giá" gồm nhiều `assessment_result`, đây là 1 entity mới chưa từng xuất hiện ở Domain Architecture, cần review riêng (tương tự DECISION-047) trước khi thêm | Medium | Chưa có Domain Architecture nào gợi ý khái niệm này — khả năng đây là nhãn trùng tên với `assessment_result` trong yêu cầu Round 2 |
| 3 | **`ExpansionRecord` không nằm trong phạm vi Round 2** — đây là entity đã khóa ở Logical Database Model (Boundary 4, con trong Aggregate `KnowledgeNode`), bắt buộc cho Knowledge Node Expansion loại Deep/Structural ([DECISION-023](../11_Decisions/DECISION-023-Controlled-Knowledge-Expansion.md)) — nếu không thiết kế ở Round nào, audit requirement này treo lửng tương tự tình huống `learning_session_transition` ở Round 1, nhưng **không tự thêm bảng ở Round 2 này** (rút kinh nghiệm từ Round 1: để Founder/ChatGPT quyết định rõ trước, không tự thêm trước rồi xin duyệt sau) | **Medium-High** | Khuyến nghị: xử lý ở Round 3 hoặc 1 Round bổ sung riêng, đừng để treo quá lâu |
| 4 | **`evidence_weight`/`confidence`/`teach_capability_scores` dùng kiểu dữ liệu suy luận của Claude** (`numeric(4,3)`, `numeric(3,2)`, `jsonb`) — Gap 5 (công thức Mastery Score, capability_weight, evidence_weight) vẫn hoàn toàn mở ở Domain Architecture — đây là lựa chọn **hợp lý nhưng không phải quyết định Founder/ChatGPT đã chốt** | Medium | Đổi kiểu dữ liệu sau (ví dụ nếu cần JSONB thay numeric, hoặc ngược lại) là thay đổi cột, không phải thiết kế lại bảng |
| 5 | **`relation_type` (knowledge_edge) và `domain_category` (knowledge_node) dùng CHECK constraint trên danh sách CHƯA đầy đủ** (Open Question #18 và #3 vẫn mở) — nếu Founder thêm giá trị mới sau, cần `ALTER TABLE ... DROP CONSTRAINT` + `ADD CONSTRAINT` (chi phí thấp nhưng không phải 0) | Low-Medium | Đã đánh dấu "đề xuất, chưa khóa cứng" ở từng cột tương ứng |
| 6 | **`trace_link` không có FK vật lý** — toàn vẹn dữ liệu (`source_id`/`target_id` trỏ đúng bảng theo `*_type`) phụ thuộc hoàn toàn Application Layer, PostgreSQL không tự kiểm tra được | Medium (đã biết, đánh đổi cố ý từ DECISION-038, không phải lỗi Round 2) | Khuyến nghị: viết test tích hợp kiểm tra invariant này ở tầng Application, không phải DB |
| 7 | **RLS cho `trace_link` không có pattern đơn giản** (mục 4) | Medium | Khuyến nghị toàn bộ truy cập qua Backend (service role) thay vì RLS trực tiếp cho bảng này |
| 8 | **`knowledge_node`/`knowledge_edge` là bảng "shared/global" đầu tiên** — khác hẳn pattern RLS "per-learner" đã dùng nhất quán ở Round 1 — cần thiết kế RLS Policy riêng theo role (`authenticated` đọc, service role ghi), không theo `learner_id` | Low (đã nhận diện rõ, không phải lỗi) | Ghi nhận để Round viết RLS Policy thật không áp nhầm pattern Round 1 |

## Liên kết ngược

[DatabaseBlueprint.md](DatabaseBlueprint.md), [LogicalDatabaseModel.md](LogicalDatabaseModel.md), [DatabaseNamingConvention.md](DatabaseNamingConvention.md), [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md), [DECISION-015](../11_Decisions/DECISION-015-Knowledge-Engine.md), [DECISION-022](../11_Decisions/DECISION-022-Evidence-KnowledgeNode-M2M.md), [DECISION-025](../11_Decisions/DECISION-025-Knowledge-Graph-DAG.md), [DECISION-026](../11_Decisions/DECISION-026-Assessment-Core-Domain.md), [DECISION-029](../11_Decisions/DECISION-029-Cycle-Detection-Strategy.md), [DECISION-030](../11_Decisions/DECISION-030-Assessment-Result-Granularity.md), [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-039](../11_Decisions/DECISION-039-Knowledge-Graph-Persistence.md).

**Đánh giá: [DDL_ROUND2_REVIEW.md](DDL_ROUND2_REVIEW.md) và [ROUND2_ARCHITECTURE_REVIEW.md](ROUND2_ARCHITECTURE_REVIEW.md). Chưa có SQL/`CREATE TABLE`/Migration/API/Frontend nào được tạo.**
