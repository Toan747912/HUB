# DDL Round 4 Design — Discovery / Mentor Interaction / Recommendation Core Closure

> Database Design Phase — **Step 4B, Round 4**. Đóng 4 Core Entity còn thiếu đã được xác nhận ở [DDL_FINALIZATION_READINESS.md](DDL_FINALIZATION_READINESS.md) và [DDL_GAP_CONSOLIDATION.md](DDL_GAP_CONSOLIDATION.md) (C-01), cộng 2 forward-dependency đã hoãn có chủ đích từ Round 1–3 ([ROUND3_ARCHITECTURE_REVIEW.md](ROUND3_ARCHITECTURE_REVIEW.md) mục 5, khuyến nghị #3). Áp dụng [DatabaseNamingConvention.md](DatabaseNamingConvention.md), [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 1/2/5/6, [DatabaseBlueprint.md](DatabaseBlueprint.md) §1.13–1.16.
>
> **Thiết kế DDL ở mức mô tả — KHÔNG SQL, không API, không Frontend.** Không thiết kế Decision Header. Không giải GAP-01/GAP-02 (D1/D5 persistence) — xem [DDL_ROUND4_GAP_ANALYSIS.md](DDL_ROUND4_GAP_ANALYSIS.md) cho lý do hoãn tiếp.

## 0. Phạm vi Round 4

| # | Bảng | Loại | Lý do tồn tại | Đã hứa ở |
|---|---|---|---|---|
| 1 | `discovery_session` | Root mới (Boundary 8) | Domain #6 Discovery — DECISION-007 | [DDL_GAP_CONSOLIDATION.md](DDL_GAP_CONSOLIDATION.md) C-01 |
| 2 | `self_assessment_mismatch` | Child mới (Boundary 8) | Input cho Recommendation/Assessment, không phải mastery — DECISION-007 | C-01 |
| 3 | `mentor_session` | Root mới (Boundary 9) | Domain #7 Mentor Interaction — DECISION-031 | C-01, H-05 |
| 4 | `recommendation_proposal` | Root mới (Boundary 10) | Domain #8 Recommendation — DECISION-019/027/033 | C-01 |
| 5 | `recommendation_proposal_response` | Child mới (Boundary 10) | Đóng M-12 — "additional fact" cho Confirmed/Ignored, không in-place update | [DatabaseBlueprint.md](DatabaseBlueprint.md) §1.16, M-12 |
| 6 | `sub_session.knowledge_node_id` (FK patch) | Đóng forward dependency | Round 1 hoãn vì `knowledge_node` chưa tồn tại; nay đã tồn tại từ Round 2 | M-02 |
| 7 | `mentor_session.sub_session_id` (FK trên bảng mới #3) | Đóng forward dependency | DECISION-031 — 1 `sub_session` chứa nhiều `mentor_session` | H-05 |
| 8 | `evidence.mentor_session_id` (FK patch) | Đóng forward dependency | Round 2 để cột giữ chỗ, chưa FK — Open Question #2 | H-04 |

Tất cả 4 entity Core đã **khóa ở Logical Model** ([LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 1, Boundary 8/9/10) — không phải entity mới phát sinh ở Round 4. `recommendation_proposal_response` là bảng phụ trợ mới (Supporting Persistence Entity, cùng phân loại với `learning_session_transition` ở [DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md)) — **không** phải Core Domain Entity, **không** mở Aggregate mới (con trong Boundary 10 đã có).

---

## 1. Table Specifications

### 1.1 `discovery_session` (Discovery Domain — Boundary 8, Root)

**Purpose:** Ghi nhận 1 phiên Discovery — Discovery là "trái tim hệ thống", **liên tục** trong suốt vòng đời Learner, không chỉ ở onboarding ([DECISION-007](../11_Decisions/DECISION-007-Discovery-Engine.md)). Root của Aggregate chứa `self_assessment_mismatch[]`.

**Aggregate Owner:** Discovery Domain (Discovery Engine).

**Lifecycle:** `Created → Active → Ended` ([LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 1) — Current State Snapshot (mutable, có thể đổi `state`), khác `goal`/`evidence` (append-only).

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `discovery_session_id` | `uuid` | NOT NULL | `gen_random_uuid()` | **PK** |
| `learner_id` | `uuid` | NOT NULL | — | FK → `learner(id)` |
| `state` | `text` | NOT NULL | `'active'` | `active` / `ended` |
| `started_at` | `timestamptz` | NOT NULL | `now()` | |
| `ended_at` | `timestamptz` | NULL | — | NOT NULL chỉ khi `state = 'ended'` |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Audit — Snapshot mutable |
| `updated_by_actor_type` | `text` | NOT NULL | — | Audit |
| `updated_by_actor_id` | `uuid` | NULL | — | Audit |

**PK:** `discovery_session_id`.

**FK:** `learner_id → learner(id)` — `ON DELETE RESTRICT`.

**Uniqueness:** 🔶 **Đề xuất, chưa khóa cứng** — `uq_discovery_session_learner_id_active` (`UNIQUE (learner_id) WHERE state = 'active'`, partial unique index, cùng kỹ thuật đã dùng ở `roadmap_node_knowledge_node` Round 3) — giả định "1 Learner chỉ có 1 Discovery Session đang Active cùng lúc". **Domain Architecture/DECISION-007 không tường minh khóa invariant này** (chỉ nói Discovery là liên tục, không nói rõ có cho phép song song hay không) — flag để Founder/ChatGPT xác nhận trước khi khóa cứng, tương tự cách Round 1 để mở invariant "1 Goal active/Learner" (M-03).

**Check Constraints:**
- `ck_discovery_session_state` — `state IN ('active','ended')`
- `ck_discovery_session_ended_at_consistency` — `(state = 'ended' AND ended_at IS NOT NULL) OR (state = 'active' AND ended_at IS NULL)` (cùng pattern `sub_session` Round 1)
- `ck_discovery_session_created_by_actor_type` / `ck_discovery_session_updated_by_actor_type` — enum đóng (`learner`/`backend_core`/`ai_service`)

**Versioning:** Không áp dụng — tùy chọn theo DECISION-044, không có rủi ro ghi đồng thời đáng kể (1 Learner chỉ tương tác qua 1 phiên tại 1 thời điểm thực tế).

**Audit:** Đầy đủ 2 nhóm created/updated (Snapshot mutable).

**History Strategy:** **`history.discovery_session`** — trigger `AFTER UPDATE` ghi row cũ. **Đã chốt sẵn** ở [DatabaseNamingConvention.md](DatabaseNamingConvention.md) mục 9 (nhóm "Cần History Table" — cùng nhóm `learner`/`knowledge_node`/`mentor_session`) — Round 4 chỉ hiện thực hóa quyết định đã có, không tự quyết định mới.

**Retention Strategy:** Vĩnh viễn — `self_assessment_mismatch` và mọi `trace_link` về sau tham chiếu ngược tới nó cho mục đích explainability (D7).

---

### 1.2 `self_assessment_mismatch` (Discovery Domain — Boundary 8, Child)

**Purpose:** Ghi nhận 1 lần phát hiện **lệch giữa tự đánh giá của Learner và mức hiểu thực tế** cho 1 `knowledge_node` cụ thể — là **input** cho Recommendation/Assessment, **không phải** giá trị mastery chính nó ([DECISION-007](../11_Decisions/DECISION-007-Discovery-Engine.md)). Cơ chế xác minh mismatch cụ thể vẫn là 🔶 **Open Question** (PRD OpenQuestions #5) — Round 4 chỉ thiết kế **nơi lưu kết quả phát hiện**, không tự quyết định thuật toán phát hiện.

**Aggregate Owner:** Discovery Domain — con trong Aggregate `discovery_session` (Boundary 8).

**Lifecycle:** Append-only, immutable — 1 sự kiện đã xảy ra, không sửa lại.

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `self_assessment_mismatch_id` | `uuid` | NOT NULL | sinh ở Application Layer (ULID-style) | **PK** |
| `discovery_session_id` | `uuid` | NOT NULL | — | FK → `discovery_session` |
| `knowledge_node_id` | `uuid` | NOT NULL | — | FK → `knowledge_node` — node mà Learner tự đánh giá |
| `self_reported_level` | `text` | NOT NULL | — | `remember` / `explain` / `apply` / `teach` — mức Learner **tự nhận** đã đạt. 🔶 **Suy luận của Claude**: tái dùng đúng 4 mức Mastery Framework ([DECISION-017](../11_Decisions/DECISION-017-Mastery-Framework.md)) cho gọn nhẹ, vì Domain Architecture chưa định nghĩa 1 cấu trúc tự-đánh-giá riêng — cần Founder/ChatGPT xác nhận, có thể cần granularity khác (ví dụ thang điểm tự tin 1-5) |
| `actual_assessment_result_id` | `uuid` | NULL | — | FK → `assessment_result` — kết quả AI dùng để so sánh phát hiện mismatch; NULL nếu so sánh trực tiếp với Evidence chưa qua `assessment_result` |
| `mismatch_reasoning` | `text` | NOT NULL | — | Giải thích vì sao đây được coi là mismatch — explainability artifact cho D7, cùng vai trò `assessment_result.reasoning`/`expansion_record.expansion_reason` |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit — thực tế luôn `ai_service` |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |

**Không có `updated_at`/`updated_by_*`** — append-only, cùng nhóm `evidence`/`assessment_result`/`expansion_record`.

**PK:** `self_assessment_mismatch_id`.

**FK:**
- `discovery_session_id → discovery_session(discovery_session_id)` — `ON DELETE CASCADE` (con trong cùng Aggregate, Boundary 8)
- `knowledge_node_id → knowledge_node(knowledge_node_id)` — `ON DELETE RESTRICT` (nhất quán 100% FK trỏ `knowledge_node` đã áp dụng từ Round 2/3)
- `actual_assessment_result_id → assessment_result(assessment_result_id)` — `ON DELETE RESTRICT`

**Uniqueness:** Không có — 1 `knowledge_node` có thể bị phát hiện mismatch nhiều lần qua thời gian (mismatch có thể tái diễn hoặc được giải quyết rồi tái phát).

**Check Constraints:**
- `ck_self_assessment_mismatch_self_reported_level` — `self_reported_level IN ('remember','explain','apply','teach')` *(🔶 đề xuất, xem ghi chú cột)*
- `ck_self_assessment_mismatch_reasoning_not_empty` — `length(trim(mismatch_reasoning)) > 0` (cùng tinh thần `ck_assessment_result_reasoning_not_empty`/`ck_expansion_record_reason_not_empty`)
- `ck_self_assessment_mismatch_created_by_actor_type` — enum đóng

**Versioning:** Không áp dụng (immutable).

**Audit:** Chỉ nhóm created.

**History Strategy:** Không áp dụng — append-only đã tự là lịch sử đầy đủ. **Đã chốt sẵn** ở [DatabaseNamingConvention.md](DatabaseNamingConvention.md) mục 9 (nhóm "append-only").

**Retention Strategy:** Vĩnh viễn — là artifact explainability D7, xóa sẽ phá vỡ mọi `trace_link`/`recommendation_proposal` tham chiếu nó.

---

### 1.3 `mentor_session` (Mentor Interaction Domain — Boundary 9, Root)

**Purpose:** 1 lượt tương tác Mentor AI ↔ Learner ([DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md), giữ nguyên định nghĩa từ Round 1). Root độc lập — **không** thuộc Aggregate `LearningSession`/`SubSession`, chỉ được **tham chiếu** bởi `sub_session` ([DECISION-031](../11_Decisions/DECISION-031-SubSession-vs-MentorSession.md)).

**Aggregate Owner:** Mentor Interaction Domain.

**Lifecycle:** `Created → Active (đổi Learning Mode) → Ended (immutable sau khi kết thúc)` ([LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 1) — Current State Snapshot (mutable trong khi Active, immutable sau Ended — không có cột riêng "locked", chỉ Application Layer ngừng ghi sau `state = 'ended'`, cùng cách `learning_session` xử lý).

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `mentor_session_id` | `uuid` | NOT NULL | `gen_random_uuid()` | **PK** |
| `learner_id` | `uuid` | NOT NULL | — | FK → `learner(id)` |
| `sub_session_id` | `uuid` | NOT NULL | — | FK → `sub_session` — đóng forward dependency DECISION-031 (xem mục 1.5) |
| `learning_mode` | `text` | NOT NULL | — | `A`/`B`/`C`/`D` — 4 Learning Modes ([DECISION-008](../11_Decisions/DECISION-008-Learning-Modes.md)); **có thể đổi giữa lượt** (lý do chính khiến bảng này cần History Table, không phải append-only) |
| `state` | `text` | NOT NULL | `'active'` | `active` / `ended` |
| `started_at` | `timestamptz` | NOT NULL | `now()` | |
| `ended_at` | `timestamptz` | NULL | — | NOT NULL chỉ khi `state = 'ended'` |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `updated_by_actor_type` | `text` | NOT NULL | — | Audit |
| `updated_by_actor_id` | `uuid` | NULL | — | Audit |

**PK:** `mentor_session_id`.

**FK:**
- `learner_id → learner(id)` — `ON DELETE RESTRICT`
- `sub_session_id → sub_session(sub_session_id)` — `ON DELETE RESTRICT` — **không** `CASCADE`: theo [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 6 (Reference Rule), khi `SubSession`/`LearningSession` bị Archived, `MentorSession` **"không bị xóa, không bị sửa, tiếp tục là lịch sử độc lập"** — đây là tham chiếu **xuyên Aggregate** (Boundary 11 → Boundary 9), đúng nguyên tắc "Cascade chỉ trong Aggregate, Restrict giữa Aggregate" đã áp dụng nhất quán từ Round 1.

**Uniqueness:** Không có — 1 `sub_session` chứa nhiều `mentor_session` (1–*, DECISION-031).

**Check Constraints:**
- `ck_mentor_session_learning_mode` — `learning_mode IN ('A','B','C','D')`
- `ck_mentor_session_state` — `state IN ('active','ended')`
- `ck_mentor_session_ended_at_consistency` — `(state = 'ended' AND ended_at IS NOT NULL) OR (state = 'active' AND ended_at IS NULL)`
- `ck_mentor_session_created_by_actor_type` / `ck_mentor_session_updated_by_actor_type` — enum đóng

**Versioning:** Không áp dụng — tùy chọn theo DECISION-044, không có rủi ro ghi đồng thời xác định (1 lượt tương tác xử lý tuần tự).

**Audit:** Đầy đủ 2 nhóm created/updated (Snapshot mutable trong khi Active).

**History Strategy:** **`history.mentor_session`** — trigger `AFTER UPDATE`. **Đã chốt sẵn** ở [DatabaseNamingConvention.md](DatabaseNamingConvention.md) mục 9. Lý do thực tế cần History: đổi `learning_mode`/`state` giữa lượt làm mất giá trị cũ nếu không có History Table, khác `evidence` (immutable hoàn toàn) mà `mentor_session` sinh ra.

**Retention Strategy:** Vĩnh viễn — Logical Model mục 6 xác nhận rõ "tiếp tục là lịch sử độc lập" dù `sub_session` cha đã Archived.

**Lưu ý Adaptive Pause ([DECISION-033](../11_Decisions/DECISION-033-Adaptive-Pause.md)):** "Cần biết khi nào Paused, do ai/cái gì kích hoạt" — **không** thêm cột rời ở `mentor_session`/`learning_session` cho việc này; tín hiệu Pause là của `LearningSession` (qua `learning_session_transition`, Round 1), còn `recommendation_proposal` (mục 1.4) là nơi ghi nhận **đề xuất** Pause — tách đúng theo nguyên tắc đã chốt: tác nhân kích hoạt truy vết qua TraceLink/RecommendationProposal, không qua cột rời trên Snapshot table.

---

### 1.4 `recommendation_proposal` (Recommendation Domain — Boundary 10, Root)

**Purpose:** 1 đề xuất do Recommendation Engine tổng hợp tín hiệu sinh ra ([DECISION-019](../11_Decisions/DECISION-019-Recommendation-Engine.md)) — Recommendation Engine **chỉ tổng hợp tín hiệu thành đề xuất, không bao giờ tự thực thi** ([AI/RecommendationEngine/README.md](../../AI/RecommendationEngine/README.md)). Bao gồm cả đề xuất "pause this Learning Session" ([DECISION-033](../11_Decisions/DECISION-033-Adaptive-Pause.md) — không phải loại hành động cấu trúc riêng, chỉ thêm 1 giá trị `action_type`).

**Aggregate Owner:** Recommendation Domain — Root, standalone (Boundary 10).

**Lifecycle:** `Created (Proposed, immutable)` — bảng này **chỉ append**, không có "Confirmed"/"Ignored" tại đây (xem mục 1.5 `recommendation_proposal_response`, đúng nguyên tắc Logical Model "1-time transition, recorded as an additional fact, not in-place update").

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `recommendation_proposal_id` | `uuid` | NOT NULL | sinh ở Application Layer (ULID-style) | **PK** |
| `learner_id` | `uuid` | NOT NULL | — | FK → `learner(id)` |
| `action_type` | `text` | NOT NULL | — | `pause_learning_session` / `review_knowledge_node` / `roadmap_adjustment_suggestion` — 🔶 **suy luận của Claude**, danh sách tổng hợp từ DECISION-033 (pause) + [AI/RecommendationEngine/README.md](../../AI/RecommendationEngine/README.md) (roadmap critique, regression signal) — **chưa có Decision Log nào khóa danh sách đầy đủ**, cần Founder/ChatGPT xác nhận/bổ sung trước khi sinh SQL |
| `payload` | `jsonb` | NOT NULL | `'{}'` | Chi tiết hành động đề xuất (ví dụ `knowledge_node_id` cần review, `roadmap_node_id` cần điều chỉnh) — `jsonb` vì cấu trúc khác nhau theo `action_type`, cùng lý do `evidence.raw_reference`/`assessment_result.teach_capability_scores` |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit — thực tế luôn `ai_service` |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |

**Không có `updated_at`/`updated_by_*`** — append-only, immutable (Logical Model: "Created (Proposed, immutable)").

**PK:** `recommendation_proposal_id`.

**FK:** `learner_id → learner(id)` — `ON DELETE RESTRICT`.

**`traced_to[]` (DECISION-027 — bắt buộc, không ngoại lệ):** **không** là cột vật lý trên bảng này — theo [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md), mọi truy vết đi qua `trace_link` với `source_type = 'recommendation_proposal'` (đã có sẵn trong enum `ck_trace_link_source_type` từ Round 2 — không cần sửa `trace_link`). **Forward dependency mới phát hiện ở Round 4** (xem mục 6 Risks): `trace_link.target_type` hiện tại (`evidence`/`assessment_result`/`discovery_session`) **chưa bao gồm `self_assessment_mismatch`** — nếu 1 `recommendation_proposal` cần trace trực tiếp tới `self_assessment_mismatch` (ví dụ đề xuất sinh ra từ chính lần phát hiện mismatch, không qua `assessment_result`), cần mở rộng `ck_trace_link_target_type` thêm giá trị này. Đây là **mở rộng enum value**, không phải thiết kế cơ chế mới — Round 4 **ghi nhận**, không tự sửa `trace_link` (ngoài phạm vi được giao).

**Uniqueness:** Không có.

**Check Constraints:**
- `ck_recommendation_proposal_action_type` — `action_type IN ('pause_learning_session','review_knowledge_node','roadmap_adjustment_suggestion')` *(🔶 đề xuất, xem ghi chú cột)*
- `ck_recommendation_proposal_created_by_actor_type` — enum đóng

**Versioning:** Không áp dụng (immutable).

**Audit:** Chỉ nhóm created.

**History Strategy:** Không áp dụng — append-only. **Đã chốt sẵn** ở [DatabaseNamingConvention.md](DatabaseNamingConvention.md) mục 9.

**Retention Strategy:** Vĩnh viễn.

---

### 1.5 `recommendation_proposal_response` (Recommendation Domain — Boundary 10, Child mới)

**Purpose:** Đóng [M-12](DDL_GAP_CONSOLIDATION.md) — ghi nhận phản hồi của Learner cho 1 `recommendation_proposal` (`Confirmed` / `Ignored`) như **1 fact bổ sung riêng**, đúng nguyên tắc Logical Model ("1-time transition, recorded as an additional fact, not in-place update") — **không** thêm cột `status` mutable trên `recommendation_proposal` (sẽ phá vỡ tính append-only/no-history đã chốt ở mục 1.4).

**Aggregate Owner:** Recommendation Domain — con trong Aggregate `recommendation_proposal` (Boundary 10, không mở Boundary mới — **Supporting Persistence Entity**, cùng phân loại `learning_session_transition`/`approval_record`, không phải Core Domain Entity mới).

**Lifecycle:** Append-only, immutable — đúng 1 row / `recommendation_proposal` (xem Uniqueness).

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `recommendation_proposal_response_id` | `uuid` | NOT NULL | sinh ở Application Layer (ULID-style) | **PK** |
| `recommendation_proposal_id` | `uuid` | NOT NULL | — | FK → `recommendation_proposal` |
| `response` | `text` | NOT NULL | — | `confirmed` / `ignored` |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit — thực tế luôn `learner` (Human Control Boundary: "AI đề xuất, cần Learner xác nhận") |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |

**Không có `updated_at`/`updated_by_*`** — append-only, immutable, con trong Aggregate `recommendation_proposal`.

**PK:** `recommendation_proposal_response_id`.

**FK:** `recommendation_proposal_id → recommendation_proposal(recommendation_proposal_id)` — `ON DELETE CASCADE` (con trong cùng Aggregate, Boundary 10).

**Uniqueness:** `uq_recommendation_proposal_response_recommendation_proposal_id` — `UNIQUE (recommendation_proposal_id)` — thực thi đúng "1-time transition" ở tầng DB: không cho phép 1 đề xuất bị phản hồi 2 lần (không có "đổi ý" — nếu Domain Architecture sau này cần đổi ý, cần Decision Log mới, Round 4 không tự suy diễn thêm).

**Check Constraints:**
- `ck_recommendation_proposal_response_response` — `response IN ('confirmed','ignored')`
- `ck_recommendation_proposal_response_created_by_actor_type` — enum đóng

**Versioning:** Không áp dụng.

**Audit:** Chỉ nhóm created.

**History Strategy:** Không áp dụng — append-only, và là bảng phụ trợ mới (không nằm trong danh sách 4 nhóm History đã phân loại ở [DatabaseNamingConvention.md](DatabaseNamingConvention.md) mục 9 vì chưa tồn tại lúc tài liệu đó viết — nhất quán suy luận: append-only luôn không cần History Table, áp dụng nguyên tắc chung, không cần sửa tài liệu mục 9).

**Retention Strategy:** Vĩnh viễn.

---

### 1.6 Đóng 2 forward dependency còn mở từ Round 1–3

**1. `sub_session.knowledge_node_id → knowledge_node(knowledge_node_id)`** — `ON DELETE RESTRICT`. Cột đã tồn tại từ Round 1 ([DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md) mục 1.7) nhưng chưa có FK vì `knowledge_node` chưa tồn tại lúc đó; `knowledge_node` đã tồn tại từ Round 2 — đóng ngay bây giờ theo khuyến nghị #3 của [ROUND3_ARCHITECTURE_REVIEW.md](ROUND3_ARCHITECTURE_REVIEW.md). Không đổi `ck_sub_session_scope_exactly_one` (đã đúng từ Round 1).

**2. `evidence.mentor_session_id → mentor_session(mentor_session_id)`** — `ON DELETE RESTRICT`, **giữ NULLABLE** (đóng Open Question #2: **tùy chọn, không bắt buộc**). Lý do quyết định: `evidence.source_type` đã luôn cho phép 3 giá trị `mentor_session`/`submission`/`discovery_session` ([DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md) mục 1.4) — Evidence sinh từ `submission`/`discovery_session` **không có** `mentor_session` nào để trỏ tới, nên bắt buộc `NOT NULL` sẽ sai với 2/3 `source_type`. 🔶 **Cờ cho Founder/ChatGPT:** nên thêm `ck_evidence_mentor_session_id_consistency` (`source_type = 'mentor_session' ⇒ mentor_session_id IS NOT NULL`) để tăng integrity — Round 4 **đề xuất**, không tự khóa cứng vì đây là mở rộng CHECK ngoài phạm vi bảng đang thiết kế (`evidence` đã "xong" từ Round 2).

Cả 2 đóng forward-dependency này **không phải bảng mới**, chỉ là `ALTER TABLE ... ADD CONSTRAINT` patch — liệt kê ở đây để tài liệu hóa đầy đủ trước khi sinh SQL.

---

## 2. Constraint Specifications (tổng hợp)

| Bảng | Unique | Check | FK quan trọng |
|---|---|---|---|
| `discovery_session` | `uq_discovery_session_learner_id_active` *(partial, 🔶 đề xuất)* | `ck_*_state`, `ck_*_ended_at_consistency`, `ck_*_actor_type` ×2 | `learner_id` `RESTRICT` |
| `self_assessment_mismatch` | — | `ck_*_self_reported_level` *(đề xuất)*, `ck_*_reasoning_not_empty`, `ck_*_actor_type` | `discovery_session_id` `CASCADE`; `knowledge_node_id` `RESTRICT`; `actual_assessment_result_id` `RESTRICT` |
| `mentor_session` | — | `ck_*_learning_mode`, `ck_*_state`, `ck_*_ended_at_consistency`, `ck_*_actor_type` ×2 | `learner_id` `RESTRICT`; `sub_session_id` `RESTRICT` |
| `recommendation_proposal` | — | `ck_*_action_type` *(đề xuất)*, `ck_*_actor_type` | `learner_id` `RESTRICT` |
| `recommendation_proposal_response` | `uq_recommendation_proposal_response_recommendation_proposal_id` | `ck_*_response`, `ck_*_actor_type` | `recommendation_proposal_id` `CASCADE` |
| `sub_session` *(patch)* | — | không đổi | `+knowledge_node_id` `RESTRICT` |
| `evidence` *(patch)* | — | không đổi (🔶 đề xuất thêm `ck_evidence_mentor_session_id_consistency`, chưa khóa) | `+mentor_session_id` `RESTRICT` (nullable) |

---

## 3. Relationship Validation

| Quan hệ cần kiểm (Task 2) | Cardinality đã chốt | Thiết kế Round 4 | Khớp? |
|---|---|---|---|
| `discovery_session` ↔ `learner` | * — 1 | `discovery_session.learner_id → learner(id)` | ✅ |
| `discovery_session` ↔ `self_assessment_mismatch` | 1 — * | `self_assessment_mismatch.discovery_session_id → discovery_session`, `CASCADE` trong Aggregate | ✅ |
| `mentor_session` ↔ `sub_session` | * — 1 | `mentor_session.sub_session_id → sub_session`, `RESTRICT` xuyên Aggregate (Logical Model mục 6) | ✅ |
| `mentor_session` ↔ `evidence` | 1 — * (`evidence.source_type='mentor_session'`) | `evidence.mentor_session_id → mentor_session`, nullable, `RESTRICT` | ✅ — đóng H-04/OQ-2 |
| `mentor_session` ↔ `assessment_result` | — | **Không có quan hệ trực tiếp đã chốt ở Logical Model** — `assessment_result` chỉ liên kết `mentor_session` **gián tiếp** qua `evidence` (`assessment_result` ← `trace_link` ← `evidence` ← `mentor_session_id`). Round 4 **không tự thêm FK** `assessment_result.mentor_session_id` vì không có cardinality nào được khóa cho quan hệ này ở [LogicalDatabaseModel.md](LogicalDatabaseModel.md) — ghi nhận là **gap không phải lỗi**, xem mục 6 Risk #1 | ⚠️ Xem Risk #1 |
| `recommendation_proposal` ↔ `learner` | * — 1 | `recommendation_proposal.learner_id → learner(id)` | ✅ |
| `recommendation_proposal` ↔ `goal` | — | **Không có FK trực tiếp** — đúng thiết kế: theo [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md), nếu 1 đề xuất liên quan tới `goal`/`roadmap` cụ thể, việc đó nằm trong `payload` (jsonb, mục 1.4) hoặc qua `trace_link`, không qua FK vật lý trực tiếp — Logical Model mục 2 cũng **không** khóa cardinality `RecommendationProposal — Goal` nào | ✅ (cố ý không FK) |
| `recommendation_proposal` ↔ `roadmap` | — | Tương tự `goal` — không FK trực tiếp, qua `payload`/`trace_link` nếu cần | ✅ (cố ý không FK) |
| `recommendation_proposal` ↔ `assessment_result` | * — * (qua `traced_to[]`) | `trace_link` với `source_type='recommendation_proposal'`, `target_type='assessment_result'` — cả 2 giá trị **đã có sẵn** trong enum từ Round 2, không cần sửa `trace_link` | ✅ |
| `recommendation_proposal` ↔ `trace_link` | * — * (đa hình) | `trace_link.source_type IN (...,'recommendation_proposal')` — đã có từ Round 2 | ✅ — nhưng xem Risk #2 (target_type thiếu `self_assessment_mismatch`) |

**Đối chiếu Aggregate Boundary:** `discovery_session`/`self_assessment_mismatch` mở Boundary 8 đúng kế hoạch Logical Model, không Boundary mới ngoài dự kiến. `mentor_session` mở Boundary 9, độc lập, chỉ tham chiếu (không sở hữu) `sub_session` — đúng DECISION-031, không Ownership Conflict (Mentor Interaction Domain vẫn write-owner `mentor_session`; Learning Session Domain vẫn write-owner `sub_session`). `recommendation_proposal`/`recommendation_proposal_response` mở Boundary 10, standalone, không phụ thuộc cấu trúc `goal`/`roadmap` — đúng vai trò "Recommendation chỉ tổng hợp tín hiệu, không sở hữu state của module khác" (DECISION-019).

**Không phát hiện sai lệch cardinality nào** ngoài 2 điểm đã ghi chú ⚠️ (không phải sai lệch — là gap chưa-được-khóa ở tầng Domain Architecture, không phải lỗi thiết kế Round 4).

---

## 4. Delete Rule Review (tiếp nối Round 1–3)

| FK | `ON DELETE` | Hệ quả |
|---|---|---|
| `discovery_session.learner_id` | `RESTRICT` | Nhất quán mọi FK → `learner` |
| `self_assessment_mismatch.discovery_session_id` | `CASCADE` | Trong Aggregate Boundary 8 |
| `self_assessment_mismatch.knowledge_node_id` | `RESTRICT` | Nhất quán 100% FK → `knowledge_node` đã áp dụng từ Round 2 |
| `self_assessment_mismatch.actual_assessment_result_id` | `RESTRICT` | Không xóa được `assessment_result` nếu còn mismatch tham chiếu (thực tế `assessment_result` không hard-delete) |
| `mentor_session.learner_id` | `RESTRICT` | Nhất quán |
| `mentor_session.sub_session_id` | `RESTRICT` | **Xuyên Aggregate** — đúng nguyên tắc Logical Model mục 6 ("Archive độc lập"), không `CASCADE` |
| `recommendation_proposal.learner_id` | `RESTRICT` | Nhất quán |
| `recommendation_proposal_response.recommendation_proposal_id` | `CASCADE` | Trong Aggregate Boundary 10 |
| `sub_session.knowledge_node_id` *(patch)* | `RESTRICT` | Nhất quán FK → `knowledge_node` |
| `evidence.mentor_session_id` *(patch)* | `RESTRICT` | Không xóa được `mentor_session` nếu còn `evidence` tham chiếu (thực tế không hard-delete) |

**Kết luận: vẫn giữ đúng 100% FK trỏ tới `knowledge_node` là `RESTRICT`; mọi FK xuyên Aggregate là `RESTRICT`; `CASCADE` chỉ trong cùng Aggregate.** Không có ngoại lệ mới — nhất quán Round 1–3.

---

## 5. RLS Impact Notes (Supabase)

| Bảng | Boundary RLS đề xuất | Đặc điểm |
|---|---|---|
| `discovery_session` | `learner_id = auth.uid()` | 0-hop, Strict RLS, cùng nhóm `evidence`/`assessment_result` |
| `self_assessment_mismatch` | qua `discovery_session.learner_id = auth.uid()` | 1-hop |
| `mentor_session` | `learner_id = auth.uid()` | 0-hop |
| `recommendation_proposal` | `learner_id = auth.uid()` | 0-hop |
| `recommendation_proposal_response` | qua `recommendation_proposal.learner_id = auth.uid()` | 1-hop |

Tất cả khớp với phân loại đã pre-classify ở [RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md) §1 (dòng 18-20) và [TABLE_SECURITY_CLASSIFICATION.md](TABLE_SECURITY_CLASSIFICATION.md) §5 — Round 4 **không** phát hiện sai lệch nào với phân loại RLS đã có trước khi 4 bảng này tồn tại.

---

## 6. Risks

| # | Rủi ro | Mức độ | Ghi chú |
|---|---|---|---|
| 1 | **`mentor_session` ↔ `assessment_result` không có FK trực tiếp** — chỉ liên kết gián tiếp qua `evidence` | Low | Không phải gap ngoài dự kiến — Logical Model không khóa cardinality trực tiếp nào; nếu cần truy vết "assessment nào sinh từ mentor_session nào", phải JOIN qua `evidence`/`trace_link`, đủ dùng nhưng nhiều hop |
| 2 | **`trace_link.target_type` chưa bao gồm `self_assessment_mismatch`** — nếu `recommendation_proposal` cần trace trực tiếp tới 1 mismatch cụ thể (không qua `assessment_result`), DB-level không cho phép cho tới khi enum được mở rộng | **Medium** | Cần Founder/ChatGPT xác nhận có cần mở `ck_trace_link_target_type` hay không — Round 4 không tự sửa `trace_link` (ngoài phạm vi được giao) |
| 3 | **`action_type`/`self_reported_level` là enum suy luận của Claude**, chưa có Decision Log khóa cứng (mục 1.2, 1.4) | Medium | Dễ sửa (mở rộng/đổi danh sách CHECK) trước khi sinh SQL — không phải kiến trúc sai |
| 4 | **`uq_discovery_session_learner_id_active` chưa được Domain Architecture xác nhận là invariant thật** | Medium | Cùng bản chất rủi ro với "1 Goal active/Learner" (M-03, chưa enforce) — nhưng khác ở chỗ đây **có thể** enforce bằng partial unique index nếu được xác nhận, không cần trigger phức tạp |
| 5 | **`evidence.mentor_session_id` không có CHECK ràng buộc với `source_type`** (mục 1.6) — có thể tạo `evidence` với `source_type='mentor_session'` nhưng `mentor_session_id IS NULL`, hoặc ngược lại | Medium | Đề xuất `ck_evidence_mentor_session_id_consistency`, chưa khóa cứng — cần xác nhận trước khi sinh SQL |
| 6 | **`recommendation_proposal_response` không cho phép "đổi ý"** (UNIQUE 1 row/proposal) | Low | Đúng theo Logical Model "1-time transition" — nếu Founder/ChatGPT muốn cho phép đổi ý sau này, cần Decision Log mới sửa lại UNIQUE này, không tự suy diễn thêm ở Round 4 |
| 7 | **`mentor_session.learning_mode` đổi giữa lượt chỉ được giữ lịch sử qua `history.mentor_session`**, không có cột riêng "learning_mode_history[]" | Low | Đủ dùng — History Table trigger-maintained đã chốt ở mục 9 Naming Convention, không cần cơ chế thứ 2 |

## Liên kết ngược

[DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md), [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md), [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md), [ROUND3_ARCHITECTURE_REVIEW.md](ROUND3_ARCHITECTURE_REVIEW.md), [DDL_GAP_CONSOLIDATION.md](DDL_GAP_CONSOLIDATION.md), [DDL_FINALIZATION_READINESS.md](DDL_FINALIZATION_READINESS.md), [LogicalDatabaseModel.md](LogicalDatabaseModel.md), [DatabaseBlueprint.md](DatabaseBlueprint.md), [DatabaseNamingConvention.md](DatabaseNamingConvention.md), [DECISION-007](../11_Decisions/DECISION-007-Discovery-Engine.md), [DECISION-019](../11_Decisions/DECISION-019-Recommendation-Engine.md), [DECISION-027](../11_Decisions/DECISION-027-Explainability-First.md), [DECISION-031](../11_Decisions/DECISION-031-SubSession-vs-MentorSession.md), [DECISION-033](../11_Decisions/DECISION-033-Adaptive-Pause.md), [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md).

**Đánh giá: [DDL_ROUND4_ARCHITECTURE_REVIEW.md](DDL_ROUND4_ARCHITECTURE_REVIEW.md) và [DDL_ROUND4_GAP_ANALYSIS.md](DDL_ROUND4_GAP_ANALYSIS.md). Chưa có SQL/API/Frontend nào được tạo. Không thiết kế Decision Header, không giải GAP-01/GAP-02 (D1/D5).**
