# DDL Round 1 Review — Core Foundation (Identity / Goal / Roadmap / Learning Session)

> Đánh giá [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md) trước khi cho phép sinh SQL thật (`CREATE TABLE`, hiện chưa thuộc phạm vi tài liệu nào tới giờ).

## 1. Consistency

| Kiểm tra | Kết quả |
|---|---|
| Mọi entity trong phạm vi Round 1 ([LogicalDatabaseModel.md](LogicalDatabaseModel.md): `Learner`, `Goal`, `Roadmap`, `RoadmapNode`, `ApprovalRecord`, `LearningSession`, `SubSession`) đều có Table Specification | ✅ Đủ 7/7, cộng 1 bảng mới (`learning_session_transition`, xem mục 2) |
| Naming khớp [DatabaseNamingConvention.md](DatabaseNamingConvention.md) (snake_case, `<table>_id`, `uq_`/`ck_` prefix, audit columns) | ✅ Khớp toàn bộ — ngoại lệ `learner.id` đã ghi nhận đúng là ngoại lệ duy nhất theo DECISION-043 |
| Mọi FK trỏ đúng PK đã thiết kế (không có FK "lơ lửng" trong phạm vi 7 bảng) | ✅ Đúng — 2 forward dependency ra ngoài phạm vi (`knowledge_node`, `mentor_session`) đã ghi nhận rõ là hoãn, không phải sai sót |
| Audit/Versioning/History áp dụng đúng theo nhóm entity (append-only vs Current State Snapshot) đã chốt ở DECISION-044/045 | ✅ Khớp — `goal`/`approval_record`/`learning_session_transition` (append-only) không có `updated_at`/`version_number`/History Table; `learner`/`roadmap`/`roadmap_node`/`learning_session`/`sub_session` (Snapshot) có đủ audit 2 nhóm |
| Check Constraint cho mọi cột enum (`state`, `node_status`, `*_actor_type`) | ✅ Có đủ cho từng bảng, mục 2 [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md) |

**Không phát hiện mâu thuẫn nội bộ trong 7+1 bảng đã thiết kế.**

## 2. Domain Alignment

| Kiểm tra | Kết quả |
|---|---|
| Cardinality khớp [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 2 / [DatabaseBlueprint.md](DatabaseBlueprint.md) mục 2 | ✅ Đối chiếu đầy đủ ở [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md) mục 3 — không lệch |
| Ownership khớp [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 5 (Goal & Roadmap Domain, Learning Session Domain) | ✅ Không tạo Ownership Conflict mới |
| Aggregate Boundary khớp [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 5 (Boundary 2, 3, 11) | ✅ FK `ON DELETE CASCADE` chỉ dùng trong phạm vi 1 Aggregate (`roadmap_node`/`sub_session` con của `roadmap`/`learning_session`), đúng nguyên tắc "Cascade chỉ trong Aggregate, không giữa Aggregate" |
| Lifecycle khớp DECISION-032 (Goal immutable/superseded), DECISION-033 (Adaptive Pause, không ngưỡng cố định) | ✅ `goal.supersedes_goal_id` không có cơ chế xóa; `learning_session_transition.transition_actor_type` phân biệt đúng `learner` vs `recommendation_engine`, không có giá trị "timeout"/ngưỡng tự động nào được mã hóa |
| **`learning_session_transition` — bảng phát sinh ngoài 18+1 entity gốc** | ✅ **Đã đóng** — [DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md): Founder + Lead Architect đã review và **APPROVED**, phân loại chính thức **Supporting Persistence Entity** (không Domain Entity, không Aggregate mới, không Domain mới) — con phụ trợ trong Aggregate `LearningSession` (Boundary 11) |

## 3. Supabase Alignment

| Kiểm tra | Kết quả |
|---|---|
| Toàn bộ PK/FK dùng `uuid` (DECISION-043 cho `learner`; `gen_random_uuid()` cho entity Snapshot khác; ULID-style sinh ở Application Layer cho entity append-only theo [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 2 — vẫn hiệu lực) | ✅ Nhất quán |
| `learner.id REFERENCES auth.users(id) ON DELETE RESTRICT` | ✅ Đúng theo [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md) — bảo vệ DECISION-037 |
| Naming `snake_case`, không cần quote định danh | ✅ Đúng DECISION-042 |
| Default Constraint chỉ mang tính tài liệu (PostgreSQL không có named DEFAULT) | ✅ Đã ghi nhận đúng ở [DatabaseNamingConvention.md](DatabaseNamingConvention.md) mục 8 — Round 1 không liệt kê `df_*` riêng vì cột DEFAULT đã thể hiện trực tiếp trong cột "Default" của từng Table Specification |
| RLS — boundary đề xuất cho mọi bảng (mục 4 [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md)) | 🔶 **Chưa đầy đủ** — phụ thuộc câu hỏi kiến trúc chưa xác nhận (Frontend trực tiếp vs qua Backend, Risk #6) — không chặn `CREATE TABLE`/constraint của Round 1 (RLS Policy là SQL riêng, ngoài phạm vi tạo bảng), nhưng cần xác nhận trước khi viết RLS Policy thật ở bước sau |

**Không phát hiện vi phạm nào với PostgreSQL/Supabase đã được chốt ở [PLATFORM_ALIGNMENT_REVIEW.md](PLATFORM_ALIGNMENT_REVIEW.md)** — DECISION-042/043/044/045 được áp dụng đúng và nhất quán trên toàn bộ 8 bảng.

## 4. Constraint Completeness

| Loại constraint | Bao phủ |
|---|---|
| Primary Key | 8/8 bảng |
| Foreign Key | Đủ cho mọi quan hệ trong phạm vi; 2 FK hoãn có ghi nhận rõ (không phải thiếu sót) |
| Unique | 2 ràng buộc khóa cứng (`uq_roadmap_goal_id`, `uq_learning_session_goal_id`) + 1 đề xuất chưa khóa (`uq_roadmap_node_...sort_order`) |
| Check | Đủ cho mọi cột enum (`state`, `node_status`, `*_actor_type`, `transition_actor_type`) + ràng buộc logic (`ck_*_no_self_*`, `ck_sub_session_scope_exactly_one`, `ck_*_ended_at_consistency`) |
| NOT NULL | Áp dụng đúng theo phân loại append-only (chỉ `created_*`) vs Snapshot (`created_*` + `updated_*`) |

**Khoảng trống còn lại, không phải lỗi thiếu — đã ghi nhận có chủ đích:**
1. Invariant "1 Goal chưa-superseded / Learner" — không biểu diễn được bằng constraint cột thường, để Application Layer (Risk #2, [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md)).
2. FK `sub_session.knowledge_node_id` và phần `roadmap_node ↔ knowledge_node` — hoãn tới Round có Knowledge Module (Risk #4).

**Constraint Completeness: đầy đủ cho phạm vi Round 1**, không có cột nào thiếu ràng buộc nó cần trong phạm vi 7+1 bảng.

## 5. Kết luận

**READY_FOR_SQL_GENERATION** *(cập nhật — Round 1 Finalization)*

Mục NEEDS_REVISION duy nhất ở bản đánh giá trước — xác nhận `learning_session_transition` — đã được **đóng bởi [DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md)**: Founder + Lead Architect review, **APPROVED**, phân loại Supporting Persistence Entity (không Domain/Aggregate/Domain mới). Không còn mục nào trong Consistency/Domain Alignment/Supabase Alignment/Constraint Completeness ở trạng thái chờ xác nhận.

**Toàn bộ 8 bảng trong phạm vi Round 1** (`learner`, `goal`, `roadmap`, `roadmap_node`, `approval_record`, `learning_session`, `sub_session`, `learning_session_transition`) **đã sẵn sàng cho SQL Generation**, áp dụng đúng [DatabaseNamingConvention.md](DatabaseNamingConvention.md) và toàn bộ DECISION-042..047.

**Risk #1 (cấu trúc nội dung `text` tự do), #5 (RLS 2-hop), #6 (Frontend trực tiếp vs qua Backend), #7 (Unique đề xuất)** — vẫn ghi nhận, khuyến nghị xác nhận sớm, nhưng **không gate** verdict này (không ảnh hưởng việc bảng có tồn tại/tạo được hay không, chỉ ảnh hưởng chi tiết cột/policy ở bước sau, nhất quán với cách phân loại "Nhóm A/B" đã dùng ở [PHYSICAL_DESIGN_READINESS.md](PHYSICAL_DESIGN_READINESS.md)).

## Liên kết ngược

[DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md), [DatabaseBlueprint.md](DatabaseBlueprint.md), [LogicalDatabaseModel.md](LogicalDatabaseModel.md), [DatabaseNamingConvention.md](DatabaseNamingConvention.md), [PLATFORM_ALIGNMENT_REVIEW.md](PLATFORM_ALIGNMENT_REVIEW.md), [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md), [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md).
