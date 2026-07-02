# DDL Round 1 Design — Core Foundation (Identity / Goal / Roadmap / Learning Session)

> Database Design Phase — **Step 4B, Round 1**. Áp dụng [DatabaseNamingConvention.md](DatabaseNamingConvention.md) (snake_case), [DECISION-042](../11_Decisions/DECISION-042-Database-Naming-Convention-Alignment.md)..[045](../11_Decisions/DECISION-045-Temporal-Strategy.md), và toàn bộ [DatabaseBlueprint.md](DatabaseBlueprint.md) (Step 4A). Nguồn entity: [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 1.
>
> **Đây là thiết kế DDL chi tiết ở mức mô tả (table/column/type/constraint) — KHÔNG có `CREATE TABLE`, không SQL Script.** Step tiếp theo (sinh SQL thực tế) chỉ bắt đầu sau khi [DDL_ROUND1_REVIEW.md](DDL_ROUND1_REVIEW.md) kết luận `READY_FOR_SQL_GENERATION`.

## 0. Phạm vi Round 1

| Module | Entity trong Logical Model | Bảng thiết kế ở Round này |
|---|---|---|
| Identity | `Learner` | `learner` |
| Goal | `Goal` | `goal` |
| Roadmap | `Roadmap`, `RoadmapNode`, `ApprovalRecord` | `roadmap`, `roadmap_node`, `approval_record` |
| Learning Session | `LearningSession`, `SubSession` | `learning_session`, `sub_session`, **`learning_session_transition`** *(mới — xem mục 0.1)* |

**4 module / 7 bảng.** Knowledge, Evidence, Assessment, Discovery, Mentor Interaction, Recommendation, `TraceLink` — **ngoài phạm vi**, để Round 2+.

### 0.1 Bổ sung 1 bảng ngoài 18+1 entity gốc: `learning_session_transition` — ✅ **APPROVED** ([DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md))

[PersistenceArchitecture.md](PersistenceArchitecture.md) mục 1 "khuyến nghị mạnh" 1 transition log cho `LearningSession` (audit-by-companion-log) nhưng **chưa từng được tạo thành entity riêng** ở Logical Model. [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md) dựa vào "transition log khuyến nghị" này để **không** yêu cầu History Table cho `learning_session`/`sub_session` — nhưng nếu bảng này không thực sự tồn tại, kết luận đó không có gì hậu thuẫn, và yêu cầu Audit ở [DatabaseBlueprint.md](DatabaseBlueprint.md) mục 1.19 ("cần biết nguồn gốc transition... qua `TraceLink`") cũng treo lửng vì `TraceLink` chưa nằm trong phạm vi Round 1.

**Tạo `learning_session_transition`** — append-only, ghi mỗi lần `state` đổi, kèm tác nhân kích hoạt (`learner` tự pause hay do `recommendation_engine` đề xuất + Learner xác nhận, theo [DECISION-033](../11_Decisions/DECISION-033-Adaptive-Pause.md)). Đây tạm thời đóng vai trò mà `TraceLink` sẽ đóng đầy đủ hơn ở Round sau — không xung đột, vì `TraceLink` (khi tới Round của nó) sẽ bổ sung khả năng truy vết đa hình rộng hơn (`trace_link.target_type = 'recommendation_proposal'`), còn bảng này chỉ phục vụ riêng nhu cầu hẹp "lịch sử state của 1 LearningSession" ngay từ Round 1, tránh để trống hoàn toàn.

**Founder + Lead Architect đã review và APPROVED** ([DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md)), với phân loại chính thức: **Supporting Persistence Entity** — KHÔNG là Core Domain Entity, KHÔNG là Aggregate mới, KHÔNG là Domain mới; con phụ trợ trong Aggregate `LearningSession` (Boundary 11). Đây không còn là điểm "cần xác nhận" — mục 5 (Risk #3) và [DDL_ROUND1_REVIEW.md](DDL_ROUND1_REVIEW.md) đã cập nhật theo quyết định này.

---

## 1. Table Specifications

### 1.1 `learner` (Identity Module)

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | — | **PK**, FK → `auth.users(id)` ([DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md)) — ngoại lệ duy nhất của quy tắc `<table>_id` |
| `anonymized_at` | `timestamptz` | NULL | — | Right-to-be-Forgotten ([DECISION-037](../11_Decisions/DECISION-037-Right-To-Be-Forgotten-Anonymization.md)) — NULL = active, NOT NULL = đã Anonymized |
| `version_number` | `bigint` | NOT NULL | `1` | Versioning ([DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md)) — áp dụng tùy chọn, không có hại |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | `'learner'` | Audit — enum đóng, xem Check Constraint |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `updated_by_actor_type` | `text` | NOT NULL | `'learner'` | Audit |
| `updated_by_actor_id` | `uuid` | NULL | — | Audit |

**Primary Key:** `id` (= `auth.users.id`, không tự sinh).

**Foreign Keys:** `id → auth.users(id)` — `ON DELETE RESTRICT` (bắt buộc, bảo vệ DECISION-037: Backend phải Anonymize `learner` trước khi cho phép xóa `auth.users`, không dựa cascade tự động).

**Unique Constraints:** không có thêm ngoài PK — **🔶 Risk:** không có ràng buộc business uniqueness nào (ví dụ email) vì Domain Architecture chưa định nghĩa thuộc tính hồ sơ nào cho `Learner` ngoài định danh ([PersistenceArchitecture.md](PersistenceArchitecture.md) mục 1 — thuộc phạm vi Supabase Auth).

**Check Constraints:**
- `ck_learner_created_by_actor_type` — `created_by_actor_type IN ('learner','backend_core','ai_service')`
- `ck_learner_updated_by_actor_type` — cùng danh sách

**Versioning:** `version_number` (tùy chọn, theo DECISION-044).

**Audit Fields:** đầy đủ 2 nhóm created/updated (entity Current State Snapshot).

**History Strategy:** `history.learner` — trigger-maintained, `AFTER UPDATE` (DECISION-045, nhóm "không có companion log").

---

### 1.2 `goal` (Goal Module)

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `goal_id` | `uuid` | NOT NULL | `gen_random_uuid()` | **PK** |
| `learner_id` | `uuid` | NOT NULL | — | FK → `learner(id)` |
| `statement` | `text` | NOT NULL | — | Nội dung mục tiêu bằng ngôn ngữ tự nhiên — 🔶 xem Risk #1 (cấu trúc nội dung Goal chưa được Decision Log chốt chi tiết, chỉ có "ngôn ngữ tự nhiên" từ `DomainModel_Draft.md`) |
| `supersedes_goal_id` | `uuid` | NULL | — | FK tự tham chiếu → `goal(goal_id)` — Goal mới "thay thế" Goal cũ ([DECISION-032](../11_Decisions/DECISION-032-Immutable-Goal.md)) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |

**Không có `updated_at`/`updated_by_*`** — `Goal` là append-only/immutable ([DECISION-032](../11_Decisions/DECISION-032-Immutable-Goal.md), [PersistenceArchitecture.md](PersistenceArchitecture.md) — Insert-only Snapshot).

**Primary Key:** `goal_id`.

**Foreign Keys:**
- `learner_id → learner(id)` — `ON DELETE RESTRICT`.
- `supersedes_goal_id → goal(goal_id)` — `ON DELETE RESTRICT` (self-reference, không cascade vì Goal không bao giờ xóa).

**Unique Constraints:** không có. **🔶 Risk quan trọng (kế thừa từ [DatabaseBlueprintReview.md](DatabaseBlueprintReview.md) Risk #7):** invariant "đúng 1 Goal chưa-superseded / Learner" **không được thực thi bằng constraint ở Round 1** — đây là điều kiện dạng "không tồn tại Goal nào khác trỏ `supersedes_goal_id` tới Goal này", không biểu diễn được bằng `UNIQUE`/`CHECK` cột thường trong PostgreSQL. Để Application Layer thực thi (hoặc cân nhắc 1 cột suy ra được duy trì bằng trigger ở Round sau — không quyết định ở Round 1).

**Check Constraints:**
- `ck_goal_no_self_supersede` — `supersedes_goal_id IS NULL OR supersedes_goal_id <> goal_id`
- `ck_goal_created_by_actor_type` — `created_by_actor_type IN ('learner','backend_core','ai_service')`

**Versioning:** Không áp dụng (immutable).

**Audit Fields:** chỉ nhóm created (append-only).

**History Strategy:** Không áp dụng — append-only tự là lịch sử đầy đủ.

---

### 1.3 `roadmap` (Roadmap Module)

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `roadmap_id` | `uuid` | NOT NULL | `gen_random_uuid()` | **PK** |
| `goal_id` | `uuid` | NOT NULL | — | FK → `goal(goal_id)`, 1–1 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `updated_by_actor_type` | `text` | NOT NULL | — | Audit |
| `updated_by_actor_id` | `uuid` | NULL | — | Audit |

**Primary Key:** `roadmap_id`.

**Foreign Keys:** `goal_id → goal(goal_id)` — `ON DELETE RESTRICT`.

**Unique Constraints:** `uq_roadmap_goal_id` — `UNIQUE (goal_id)` (1 Roadmap / Goal, [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 2).

**Check Constraints:**
- `ck_roadmap_created_by_actor_type` — enum đóng (`learner`/`backend_core`/`ai_service`)
- `ck_roadmap_updated_by_actor_type` — cùng danh sách

**Versioning:** Không áp dụng — bảo vệ qua cổng `approval_record` (DECISION-044 nguyên trạng).

**Audit Fields:** đầy đủ 2 nhóm (Current State Snapshot — cấu trúc cây đổi qua `approval_record`).

**History Strategy:** **Không cần History Table** — companion log là `approval_record` (DECISION-045).

---

### 1.4 `roadmap_node` (Roadmap Module)

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `roadmap_node_id` | `uuid` | NOT NULL | `gen_random_uuid()` | **PK** |
| `roadmap_id` | `uuid` | NOT NULL | — | FK → `roadmap(roadmap_id)` |
| `parent_roadmap_node_id` | `uuid` | NULL | — | FK tự tham chiếu → `roadmap_node(roadmap_node_id)` — cây, NULL = node gốc |
| `title` | `text` | NOT NULL | — | Tên node (Module/Sub-module, ví dụ "Backend", "Upload Video") — 🔶 xem Risk #1 |
| `node_status` | `text` | NOT NULL | `'collapsed'` | `collapsed` / `expanded` / `completed` ([DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md)) |
| `sort_order` | `integer` | NOT NULL | — | Thứ tự giữa các node anh em — cần thiết vì AI **không được tự đổi thứ tự** ([DECISION-006](../11_Decisions/DECISION-006-Roadmap-Governance.md)), nên thứ tự phải là dữ liệu tường minh, đổi được duy nhất qua `approval_record` |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `updated_by_actor_type` | `text` | NOT NULL | — | Audit |
| `updated_by_actor_id` | `uuid` | NULL | — | Audit |

**Primary Key:** `roadmap_node_id`.

**Foreign Keys:**
- `roadmap_id → roadmap(roadmap_id)` — `ON DELETE CASCADE` (con trong Aggregate `Roadmap`, Boundary 3 — Cascade chỉ có ý nghĩa lý thuyết vì `roadmap` không bị xóa trong thực tế).
- `parent_roadmap_node_id → roadmap_node(roadmap_node_id)` — `ON DELETE CASCADE` (cây tự tham chiếu, cùng Aggregate).

**🔶 Forward dependency chưa tạo ở Round 1:** quan hệ M:N `roadmap_node ↔ knowledge_node` (Dependency Edge, [DECISION-015](../11_Decisions/DECISION-015-Knowledge-Engine.md)) cần 1 bảng nối (`roadmap_node_knowledge_node` hoặc tương đương) — **không thiết kế ở Round 1** vì `knowledge_node` thuộc Knowledge Module (Round sau). Bảng nối này sẽ được thêm ở Round có Knowledge Module, không ảnh hưởng cấu trúc `roadmap_node` đã thiết kế ở đây.

**Unique Constraints:** `uq_roadmap_node_roadmap_id_parent_roadmap_node_id_sort_order` — `UNIQUE (roadmap_id, parent_roadmap_node_id, sort_order)` — **đề xuất, không phải khóa cứng từ Decision Log**, ngăn 2 node anh em trùng vị trí; cần Founder/ChatGPT xác nhận (xem Risk).

**Check Constraints:**
- `ck_roadmap_node_no_self_parent` — `parent_roadmap_node_id IS NULL OR parent_roadmap_node_id <> roadmap_node_id`
- `ck_roadmap_node_status` — `node_status IN ('collapsed','expanded','completed')`
- `ck_roadmap_node_sort_order_non_negative` — `sort_order >= 0`
- `ck_roadmap_node_created_by_actor_type` / `ck_roadmap_node_updated_by_actor_type` — enum đóng

**Versioning:** Không áp dụng — bảo vệ qua `approval_record`.

**Audit Fields:** đầy đủ 2 nhóm.

**History Strategy:** **Không cần History Table** — companion log là `approval_record` (DECISION-045).

---

### 1.5 `approval_record` (Roadmap Module)

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `approval_record_id` | `uuid` | NOT NULL | sinh ở Application Layer (ULID-style, [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 2 — vẫn hiệu lực, không bị DECISION-042..045 thay đổi) | **PK** |
| `roadmap_id` | `uuid` | NOT NULL | — | FK → `roadmap(roadmap_id)` |
| `roadmap_node_id` | `uuid` | NULL | — | FK → `roadmap_node(roadmap_node_id)` — NULL nếu thay đổi áp dụng cho toàn cấu trúc, không phải 1 node cụ thể |
| `change_description` | `text` | NOT NULL | — | Mô tả thay đổi cấu trúc đã được phê duyệt — 🔶 xem Risk #1 (chưa có cấu trúc trường chi tiết hơn, ví dụ loại thay đổi `added`/`removed`/`reordered` — Domain Architecture chỉ nói "Learner phê duyệt", chưa chốt taxonomy) |
| `approved_by_learner_id` | `uuid` | NOT NULL | — | FK → `learner(id)` — chính là Learner đã phê duyệt ([DECISION-006](../11_Decisions/DECISION-006-Roadmap-Governance.md)) |
| `approved_at` | `timestamptz` | NOT NULL | `now()` | — |
| `created_by_actor_type` | `text` | NOT NULL | — | Tác nhân **đề xuất** thay đổi (thường `ai_service`), khác với người **phê duyệt** (`approved_by_learner_id`) |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |

**Không có `updated_at`/`updated_by_*`** — append-only/immutable.

**Primary Key:** `approval_record_id`.

**Foreign Keys:**
- `roadmap_id → roadmap(roadmap_id)` — `ON DELETE RESTRICT`.
- `roadmap_node_id → roadmap_node(roadmap_node_id)` — `ON DELETE RESTRICT`.
- `approved_by_learner_id → learner(id)` — `ON DELETE RESTRICT`.

**Unique Constraints:** không có — nhiều `approval_record` / `roadmap` qua thời gian là bình thường.

**Check Constraints:** `ck_approval_record_created_by_actor_type` — enum đóng.

**Versioning:** Không áp dụng.

**Audit Fields:** chỉ nhóm created (append-only).

**History Strategy:** Không áp dụng — append-only.

---

### 1.6 `learning_session` (Learning Session Module)

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `learning_session_id` | `uuid` | NOT NULL | `gen_random_uuid()` | **PK** |
| `learner_id` | `uuid` | NOT NULL | — | FK → `learner(id)` |
| `goal_id` | `uuid` | NOT NULL | — | FK → `goal(goal_id)`, 1–1 ([DECISION-028](../11_Decisions/DECISION-028-Learning-Session-Domain.md)/[032](../11_Decisions/DECISION-032-Immutable-Goal.md)) |
| `state` | `text` | NOT NULL | `'active'` | `active` / `paused` / `completed` / `archived` |
| `started_at` | `timestamptz` | NOT NULL | `now()` | — |
| `last_active_at` | `timestamptz` | NOT NULL | `now()` | Cập nhật mỗi khi có hoạt động liên quan (Evidence/Assessment/MentorSession — domain khác, ghi qua Application Layer, không phải trigger DB) |
| `ended_at` | `timestamptz` | NULL | — | Set khi `state` → `completed`/`archived` |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `updated_by_actor_type` | `text` | NOT NULL | — | Audit |
| `updated_by_actor_id` | `uuid` | NULL | — | Audit |

**Primary Key:** `learning_session_id`.

**Foreign Keys:**
- `learner_id → learner(id)` — `ON DELETE RESTRICT`.
- `goal_id → goal(goal_id)` — `ON DELETE RESTRICT`.

**Unique Constraints:** `uq_learning_session_goal_id` — `UNIQUE (goal_id)` (1 LearningSession / Goal, DECISION-028/032).

**Check Constraints:**
- `ck_learning_session_state` — `state IN ('active','paused','completed','archived')`
- `ck_learning_session_ended_at_consistency` — `(state IN ('completed','archived') AND ended_at IS NOT NULL) OR (state IN ('active','paused') AND ended_at IS NULL)`
- `ck_learning_session_created_by_actor_type` / `ck_learning_session_updated_by_actor_type` — enum đóng

**Versioning:** Không áp dụng — không có rủi ro ghi đồng thời cao được xác định ở Persistence Architecture cho entity này.

**Audit Fields:** đầy đủ 2 nhóm.

**History Strategy:** **Không cần History Table** — companion log là `learning_session_transition` (mục 1.8, mới tạo trong Round này để hiện thực hóa khuyến nghị đã có từ Step 1 — xem mục 0.1).

---

### 1.7 `sub_session` (Learning Session Module)

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `sub_session_id` | `uuid` | NOT NULL | `gen_random_uuid()` | **PK** |
| `learning_session_id` | `uuid` | NOT NULL | — | FK → `learning_session(learning_session_id)` |
| `roadmap_node_id` | `uuid` | NULL | — | FK → `roadmap_node(roadmap_node_id)` — phạm vi (1 trong 2 với `knowledge_node_id`) |
| `knowledge_node_id` | `uuid` | NULL | — | **Cột giữ chỗ — chưa có FK constraint** (bảng `knowledge_node` ngoài phạm vi Round 1); FK sẽ thêm ở Round có Knowledge Module qua `ALTER TABLE` |
| `state` | `text` | NOT NULL | `'active'` | `active` / `ended` |
| `started_at` | `timestamptz` | NOT NULL | `now()` | — |
| `ended_at` | `timestamptz` | NULL | — | Set khi `state` → `ended` |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `updated_by_actor_type` | `text` | NOT NULL | — | Audit |
| `updated_by_actor_id` | `uuid` | NULL | — | Audit |

**Primary Key:** `sub_session_id`.

**Foreign Keys:**
- `learning_session_id → learning_session(learning_session_id)` — `ON DELETE CASCADE` (con trong Aggregate `LearningSession`, Boundary 11).
- `roadmap_node_id → roadmap_node(roadmap_node_id)` — `ON DELETE RESTRICT`.
- `knowledge_node_id` — **chưa có FK** (xem trên).

**🔶 Forward dependency chưa tạo ở Round 1:** liên kết `sub_session → mentor_session` (`mentor_session_refs[]`, [DECISION-031](../11_Decisions/DECISION-031-SubSession-vs-MentorSession.md)) thuộc Mentor Interaction Module — **không thiết kế ở Round 1**. Round có Mentor Interaction Module sẽ thêm bảng nối hoặc FK tương ứng.

**Unique Constraints:** không có.

**Check Constraints:**
- `ck_sub_session_scope_exactly_one` — `(roadmap_node_id IS NOT NULL)::int + (knowledge_node_id IS NOT NULL)::int = 1` (đúng 1 trong 2, theo [DatabaseNamingConvention.md](DatabaseNamingConvention.md) mục 7 — **lưu ý:** ràng buộc này không thể "hoàn chỉnh" cho tới khi `knowledge_node_id` có FK thật ở Round sau, nhưng tính đúng đắn logic của CHECK đã có thể thiết lập từ Round 1)
- `ck_sub_session_state` — `state IN ('active','ended')`
- `ck_sub_session_ended_at_consistency` — `(state = 'ended' AND ended_at IS NOT NULL) OR (state = 'active' AND ended_at IS NULL)`
- `ck_sub_session_created_by_actor_type` / `ck_sub_session_updated_by_actor_type` — enum đóng

**Versioning:** Không áp dụng.

**Audit Fields:** đầy đủ 2 nhóm.

**History Strategy:** **Không cần History Table** — companion log là `learning_session_transition`/vòng đời đơn giản (Active→Ended, không có lịch sử transition phức tạp cần ghi riêng).

---

### 1.8 `learning_session_transition` (Learning Session Module — mới, xem mục 0.1)

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `learning_session_transition_id` | `uuid` | NOT NULL | sinh ở Application Layer (ULID-style) | **PK** |
| `learning_session_id` | `uuid` | NOT NULL | — | FK → `learning_session(learning_session_id)` |
| `from_state` | `text` | NOT NULL | — | Trạng thái trước |
| `to_state` | `text` | NOT NULL | — | Trạng thái sau |
| `transition_actor_type` | `text` | NOT NULL | — | `learner` (tự pause/resume) hay `recommendation_engine` (Learner xác nhận đề xuất pause, [DECISION-033](../11_Decisions/DECISION-033-Adaptive-Pause.md)) hay `system` (transition tự nhiên, ví dụ roadmap complete → Completed) |
| `transition_actor_id` | `uuid` | NULL | — | — |
| `occurred_at` | `timestamptz` | NOT NULL | `now()` | — |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |

**Không có `updated_at`/`updated_by_*`** — append-only.

**Primary Key:** `learning_session_transition_id`.

**Foreign Keys:** `learning_session_id → learning_session(learning_session_id)` — `ON DELETE RESTRICT`.

**Unique Constraints:** không có.

**Check Constraints:**
- `ck_learning_session_transition_from_state` — `from_state IN ('active','paused','completed','archived')`
- `ck_learning_session_transition_to_state` — `to_state IN ('active','paused','completed','archived')`
- `ck_learning_session_transition_actor_type` — `transition_actor_type IN ('learner','recommendation_engine','system')`

**Versioning:** Không áp dụng.

**Audit Fields:** chỉ `created_at` (append-only, không cần `created_by_actor_type` riêng vì đã có `transition_actor_type` mang đúng ý nghĩa đó — tránh trùng lặp 2 cột cùng mục đích).

**History Strategy:** Không áp dụng — append-only tự là lịch sử.

---

## 2. Constraint Specifications (tổng hợp)

| Bảng | Unique | Check | FK quan trọng cần lưu ý |
|---|---|---|---|
| `learner` | — | `ck_learner_created_by_actor_type`, `ck_learner_updated_by_actor_type` | `id → auth.users(id)` `ON DELETE RESTRICT` |
| `goal` | — | `ck_goal_no_self_supersede`, `ck_goal_created_by_actor_type` | `supersedes_goal_id` self-ref `ON DELETE RESTRICT` |
| `roadmap` | `uq_roadmap_goal_id` | `ck_roadmap_created_by_actor_type`, `ck_roadmap_updated_by_actor_type` | `goal_id` `ON DELETE RESTRICT` |
| `roadmap_node` | `uq_roadmap_node_roadmap_id_parent_roadmap_node_id_sort_order` *(đề xuất)* | `ck_roadmap_node_no_self_parent`, `ck_roadmap_node_status`, `ck_roadmap_node_sort_order_non_negative`, `ck_roadmap_node_created_by_actor_type`, `ck_roadmap_node_updated_by_actor_type` | `roadmap_id`/`parent_roadmap_node_id` `ON DELETE CASCADE` |
| `approval_record` | — | `ck_approval_record_created_by_actor_type` | `approved_by_learner_id → learner(id)` `ON DELETE RESTRICT` |
| `learning_session` | `uq_learning_session_goal_id` | `ck_learning_session_state`, `ck_learning_session_ended_at_consistency`, `ck_learning_session_created_by_actor_type`, `ck_learning_session_updated_by_actor_type` | `goal_id` `ON DELETE RESTRICT` |
| `sub_session` | — | `ck_sub_session_scope_exactly_one`, `ck_sub_session_state`, `ck_sub_session_ended_at_consistency`, `ck_sub_session_created_by_actor_type`, `ck_sub_session_updated_by_actor_type` | `learning_session_id` `ON DELETE CASCADE`; `knowledge_node_id` **chưa có FK** |
| `learning_session_transition` | — | `ck_learning_session_transition_from_state`, `ck_learning_session_transition_to_state`, `ck_learning_session_transition_actor_type` | `learning_session_id` `ON DELETE RESTRICT` |

---

## 3. Relationship Validation

Đối chiếu lại với [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 2 và [DatabaseBlueprint.md](DatabaseBlueprint.md) mục 2 (Relationship Matrix) cho đúng 7 bảng trong phạm vi:

| Quan hệ đã chốt | Cardinality đã chốt | Thiết kế Round 1 | Khớp? |
|---|---|---|---|
| `Learner` — `Goal` | 1 — * | `goal.learner_id → learner.id`, không UNIQUE | ✅ |
| `Goal` — `Roadmap` | 1 — 1 | `roadmap.goal_id → goal.goal_id` + `uq_roadmap_goal_id` | ✅ |
| `Roadmap` — `RoadmapNode` | 1 — * | `roadmap_node.roadmap_id → roadmap.roadmap_id`, không UNIQUE | ✅ |
| `RoadmapNode` — `RoadmapNode` (tự tham chiếu, cây) | 1 — * (cha-con) | `roadmap_node.parent_roadmap_node_id → roadmap_node.roadmap_node_id` | ✅ |
| `Roadmap`/`RoadmapNode` — `ApprovalRecord` | 1 — * | `approval_record.roadmap_id`/`roadmap_node_id` FK, không UNIQUE | ✅ |
| `Learner` — `LearningSession` | 1 — * | `learning_session.learner_id → learner.id`, không UNIQUE | ✅ |
| `LearningSession` — `Goal` | 1 — 1 | `learning_session.goal_id → goal.goal_id` + `uq_learning_session_goal_id` | ✅ |
| `LearningSession` — `SubSession` | 1 — * | `sub_session.learning_session_id → learning_session.learning_session_id`, không UNIQUE | ✅ |
| `SubSession` — `RoadmapNode`/`KnowledgeNode` | * — 1 | `sub_session.roadmap_node_id`/`knowledge_node_id`, đúng 1 trong 2 (CHECK) | ✅ (KnowledgeNode FK hoãn, đã ghi nhận) |

**Không phát hiện sai lệch cardinality nào** giữa thiết kế Round 1 và Logical Database Model/Database Blueprint đã khóa.

**Boundary/Ownership đối chiếu:** `goal` write-owner Goal & Roadmap Domain; `roadmap`/`roadmap_node`/`approval_record` cùng write-owner Goal & Roadmap Domain (đúng Aggregate `Roadmap` ⊃ `RoadmapNode`/`ApprovalRecord`, Boundary 3); `learning_session`/`sub_session`/`learning_session_transition` write-owner Learning Session Domain (Boundary 11, Orchestrator) — khớp [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 5, không tạo Ownership Conflict mới.

---

## 4. RLS Impact Notes (Supabase)

> Đây là ghi chú **thiết kế** cho Row Level Security — không viết policy SQL cụ thể ở tài liệu này (ngoài phạm vi "không tạo SQL").

| Bảng | Boundary RLS đề xuất | Số hop JOIN cần để xác định `learner_id` | Ghi chú |
|---|---|---|---|
| `learner` | `id = auth.uid()` | 0 (trực tiếp) | Đơn giản nhất — đúng lý do chọn DECISION-043 |
| `goal` | `learner_id = auth.uid()` | 0 (cột trực tiếp) | Đơn giản |
| `roadmap` | qua `goal.learner_id = auth.uid()` | 1 | **Không có cột `learner_id` trực tiếp trên `roadmap`** — policy cần `EXISTS` qua `goal` |
| `roadmap_node` | qua `roadmap.goal_id → goal.learner_id` | 2 | Sâu nhất trong Round 1 — cần 2-hop JOIN cho mọi truy cập |
| `approval_record` | qua `roadmap.goal_id → goal.learner_id`, **hoặc** trực tiếp `approved_by_learner_id = auth.uid()` cho riêng người đã phê duyệt | 0 (cho người phê duyệt) hoặc 2 (cho người xem chung) | Có 2 đường — policy cần OR cả 2 nếu muốn Learner xem lại lịch sử phê duyệt của chính Roadmap họ, không chỉ những gì chính họ bấm duyệt |
| `learning_session` | `learner_id = auth.uid()` | 0 (cột trực tiếp) | Đơn giản |
| `sub_session` | qua `learning_session.learner_id = auth.uid()` | 1 | — |
| `learning_session_transition` | qua `learning_session.learner_id = auth.uid()` | 1 | — |

**Phát hiện quan trọng — đề xuất xem lại ở Round sau (không tự sửa schema ở Round 1):** `roadmap`/`roadmap_node` là 2 bảng duy nhất cần ≥1 JOIN để xác định quyền truy cập, trong khi mọi bảng khác trong Round 1 đạt được 0-1 hop nhờ có `learner_id` (trực tiếp hoặc 1 hop). Cân nhắc thêm cột `learner_id` denormalized trên `roadmap` (và có thể `roadmap_node`) chỉ để phục vụ RLS performance — đây là **trade-off chuẩn hóa vs hiệu năng RLS phổ biến trong Supabase**, không phải lỗi thiết kế, nhưng **chưa quyết định ở Round 1** (cần xác nhận Founder/ChatGPT vì thêm 1 cột "thừa" về mặt quan hệ thuần túy).

**🔶 Open Question kiến trúc lớn hơn, ảnh hưởng toàn bộ RLS Impact Notes:** chưa xác nhận **Frontend có truy vấn Supabase trực tiếp** (kiến trúc Supabase điển hình, RLS là boundary chính) **hay mọi truy cập đều đi qua `Apps/backend`** (dùng service role key, bỏ qua RLS — RLS chỉ là defense-in-depth). Câu trả lời quyết định RLS có phải boundary an ninh chính hay chỉ là lớp phòng thủ phụ — ảnh hưởng mức độ nghiêm ngặt cần thiết kế cho mọi bảng, không chỉ 7 bảng ở Round 1. **Không tự giả định ở đây** — ghi nhận làm Risk.

---

## 5. Risks

| # | Rủi ro | Mức độ | Ghi chú |
|---|---|---|---|
| 1 | **Cấu trúc nội dung `goal.statement`/`roadmap_node.title`/`approval_record.change_description` chỉ là `text` tự do** — Domain Architecture chưa chốt taxonomy chi tiết hơn (ví dụ Goal có cần `domain_category`/`target_outcome` cấu trúc hay không; RoadmapNode có cần phân biệt "Module" vs "Lesson" bằng 1 cột loại riêng hay không). Đây là suy luận tối thiểu từ `DomainModel_Draft.md`, không phải Decision Log — **cần Founder/ChatGPT xác nhận trước khi DDL thật được sinh**, vì đổi sau sẽ là thay đổi cột, không chỉ đổi giá trị | **Medium** | Không chặn Round 1 tiếp tục, nhưng nên xác nhận trước Round 2 |
| 2 | **Invariant "1 Goal active / Learner" không được DB enforce** (mục 1.2) — chỉ ghi nhận, để Application Layer xử lý ở Round 1 | Medium | Kế thừa từ DatabaseBlueprintReview.md Risk #7, chưa đóng |
| 3 | ~~`learning_session_transition` là bảng mới phát sinh trong Round 1~~ — **✅ đóng bởi [DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md)**: Founder + Lead Architect đã APPROVED, phân loại Supporting Persistence Entity (không Domain/Aggregate mới) | Đã giải quyết | — |
| 4 | **2 forward dependency chưa tạo FK** (`roadmap_node ↔ knowledge_node` M:N; `sub_session.knowledge_node_id`, `sub_session ↔ mentor_session`) — cố ý hoãn, không phải thiếu sót, nhưng cần theo dõi để không quên `ALTER TABLE ADD CONSTRAINT` ở Round có Knowledge/Mentor Interaction Module | Low (đã biết, có kế hoạch) | — |
| 5 | **RLS yêu cầu 2-hop JOIN cho `roadmap_node`** — rủi ro hiệu năng ở quy mô lớn, đề xuất denormalize `learner_id` chưa quyết định (mục 4) | Low-Medium | Không chặn Round 1, cần quyết định trước khi viết policy SQL thật |
| 6 | **Open Question kiến trúc:** Frontend truy vấn Supabase trực tiếp hay qua Backend — ảnh hưởng mức độ nghiêm ngặt RLS cần thiết kế cho mọi Round sau, không riêng Round 1 | **Medium-High** (ảnh hưởng rộng, chưa xác nhận) | Khuyến nghị xác nhận sớm, trước khi Round nào viết RLS Policy SQL thật |
| 7 | **`uq_roadmap_node_roadmap_id_parent_roadmap_node_id_sort_order` là đề xuất, không phải Decision Log** — nếu Founder/ChatGPT muốn cho phép 2 node "đồng hạng" (cùng `sort_order`, ví dụ học song song) thì cần bỏ ràng buộc này | Low | Đã đánh dấu rõ là đề xuất, dễ bỏ nếu cần |

## Liên kết ngược

[DatabaseBlueprint.md](DatabaseBlueprint.md), [LogicalDatabaseModel.md](LogicalDatabaseModel.md), [DatabaseNamingConvention.md](DatabaseNamingConvention.md), [PersistenceArchitecture.md](PersistenceArchitecture.md), [PLATFORM_ALIGNMENT_REVIEW.md](PLATFORM_ALIGNMENT_REVIEW.md), [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md), [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md).

**Đánh giá: [DDL_ROUND1_REVIEW.md](DDL_ROUND1_REVIEW.md). Chưa có SQL/`CREATE TABLE` nào được viết — đây là thiết kế DDL ở mức mô tả.**
