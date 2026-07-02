# Database Naming Convention — AI Mentor OS

> Database Design Phase — **Step 4A.5** (giữa Database Blueprint và DDL Generation, theo [DECISION-040](../11_Decisions/DECISION-040-Physical-Database-Design-Split.md)). Xây trên [DatabaseBlueprint.md](DatabaseBlueprint.md) (Step 4A) và [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) (ID/Audit/Soft Delete/Versioning Strategy, Step 3). Mục tiêu duy nhất: **khóa quy tắc đặt tên** trước khi viết DDL — không thiết kế thêm cột/bảng mới, không viết SQL.
>
> **Đã cập nhật sau Pre-DDL Platform Alignment** ([PLATFORM_ALIGNMENT_REVIEW.md](PLATFORM_ALIGNMENT_REVIEW.md)): case convention đổi từ PascalCase sang **`snake_case`** theo [DECISION-042](../11_Decisions/DECISION-042-Database-Naming-Convention-Alignment.md); cột Versioning đổi tên theo [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md) (`version_number`); cơ chế Temporal đổi theo [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md) (trigger-maintained history table, phạm vi thu hẹp); `learner` dùng UUID chia sẻ với `auth.users.id` theo [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md).
>
> Mọi ví dụ tên trong tài liệu này minh họa **quy tắc**, không phải danh sách cột chính thức của Step 4B.

## 0. Nguyên tắc nền tảng

1. **Nhất quán với tên entity đã chốt ở Domain/Logical Model** — `Learner`, `Goal`, `KnowledgeNode`... đã là PascalCase singular ở tầng Domain/Logical (tài liệu khái niệm). Tầng vật lý (Database Design) ánh xạ sang `snake_case` singular qua 1 quy tắc dịch case máy móc, không mất thông tin (`KnowledgeNode` → `knowledge_node`).
2. **PostgreSQL/Supabase là hệ quản trị mục tiêu** (Founder xác nhận, [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md)) — quy ước ưu tiên phù hợp với convention chuẩn của PostgreSQL/PostgREST/Supabase Client Library (`snake_case` không quote), không phải convention SQL Server/.NET đã từng dùng ở Step 4A.5 ban đầu.
3. **Không có tên cột/bảng mơ hồ về domain** — mọi thuật ngữ từng bị flag trùng tên ở Decision Log ("Explain", "Weight"...) phải có tiền tố/hậu tố định danh rõ ràng, không dùng tên trần (xem mục 12 và [NamingIssueResolution.md](NamingIssueResolution.md)).
4. **Không cờ chung (`is_deleted`, `is_active`...)** — kế thừa nguyên trạng [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 4 (Soft Delete Strategy). Quy ước đặt tên ở đây không tạo ngoại lệ.

---

## 1. Table Naming

**Quyết định: Singular, `snake_case`.**

| Đúng | Sai |
|---|---|
| `learner` | `learners`, `Learner`, `tbl_learner` |
| `knowledge_node` | `knowledgenode`, `KnowledgeNode`, `knowledge_nodes` |
| `assessment_result` | `assessmentresults`, `AssessmentResult` |

**Lý do:**
- Singular vì 1 bảng = 1 entity logic (1 "loại sự vật"), không phải 1 tập hợp — khớp trực tiếp với cách Domain/Logical Model luôn gọi `Goal` (không phải "Goals") khi mô tả entity. Đây là lựa chọn phong cách, không bị platform ràng buộc — giữ nguyên qua Pre-DDL Platform Alignment ([SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md) mục 2.3).
- `snake_case` vì đây là convention chuẩn của PostgreSQL — không cần quote định danh ở bất kỳ câu SQL/RLS Policy/Function nào; khớp trực tiếp với cách PostgREST (cơ chế Supabase tự sinh REST API) và `supabase-js`/`supabase gen types` giả định tên cột ([DECISION-042](../11_Decisions/DECISION-042-Database-Naming-Convention-Alignment.md)).
- Không tiền tố (`tbl_`, `t_`) — không cần thiết với schema PostgreSQL hiện đại.

---

## 2. Column Naming

**Quyết định: `snake_case`** (không `PascalCase`, không `camelCase`).

| Đúng | Sai |
|---|---|
| `learner_id` | `LearnerId`, `learnerId` |
| `created_at` | `CreatedAt`, `createdAt` |
| `knowledge_node_id` | `KnowledgeNodeId`, `knowledgeNodeId` |

**Lý do:** nhất quán với Table Naming (mục 1) — toàn bộ schema dùng 1 case convention duy nhất, đúng convention PostgreSQL/Supabase. Tầng API/Frontend (chưa bắt đầu, [07_API](../07_API/README.md)) nếu cần `camelCase` thì xử lý bằng 1 lớp transform riêng ở tầng đó — không ảnh hưởng ngược lại tên cột ở đây ([DECISION-042](../11_Decisions/DECISION-042-Database-Naming-Convention-Alignment.md)).

---

## 3. Primary Key Naming

**Quyết định: `<table_name>_id`** — không dùng `id` trần.

| Bảng | PK |
|---|---|
| `learning_session` | `learning_session_id` |
| `knowledge_node` | `knowledge_node_id` |
| `learner` | `id` *(ngoại lệ duy nhất — xem ghi chú)* |
| `trace_link` | `trace_link_id` |

**Ngoại lệ `learner`:** theo [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md), `learner.id` **chia sẻ giá trị UUID trực tiếp với `auth.users.id`** (do Supabase Auth quản lý) — giữ tên `id` (không phải `learner_id`) để khớp đúng convention `REFERENCES auth.users(id)` và pattern `public.profiles` phổ biến của Supabase. Đây là **ngoại lệ duy nhất** của quy tắc `<table_name>_id`, áp dụng vì `learner` là bảng duy nhất có PK đến từ 1 hệ thống ngoài (Supabase Auth), không tự sinh.

**Lý do quy tắc chung:** PK trần (`id`) buộc phải alias mọi lần JOIN để tránh đụng tên — với số lượng quan hệ M:N và self-reference dày đặc trong Knowledge Graph/Roadmap (DAG, cây), JOIN dài là không tránh được. `<table_name>_id` cho phép đọc trực tiếp `SELECT knowledge_node_id FROM ...` mà không cần alias để biết đang nói về khóa của bảng nào — giảm lỗi khi viết `WITH RECURSIVE` (mục 4 [DatabaseBlueprint.md](DatabaseBlueprint.md) Index Strategy #3-4, theo [DECISION-039](../11_Decisions/DECISION-039-Knowledge-Graph-Persistence.md)).

**Không còn khái niệm "Public ID riêng" cho `learner`** ([DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md)) — lý do gốc (tránh lộ thứ tự sinh tuần tự) không còn áp dụng vì UUID do Supabase Auth sinh không tuần tự. Các entity khác lộ ra ngoài API/AI Service vẫn theo nguyên tắc gốc ở [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 2 nếu cần (đánh giá riêng ở Step 4B, ngoài phạm vi DECISION-043).

---

## 4. Foreign Key Naming

**Quyết định mặc định: cùng tên với PK được tham chiếu** (`<referenced_table>_id`).

| Ví dụ | Ghi chú |
|---|---|
| `goal.learner_id` | Tham chiếu `learner.id` (UUID, theo [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md) — **không** tự đổi tên cột FK thành `learner_learner_id`, chỉ kiểu dữ liệu đổi thành UUID) |
| `roadmap.goal_id` | Tham chiếu `goal.goal_id`, đồng thời là Unique (1–1, mục 5) |
| `learning_session.goal_id` | Tham chiếu `goal.goal_id`, đồng thời là Unique (1–1, mục 5) |

**Ngoại lệ bắt buộc — khi 1 bảng có ≥2 FK trỏ tới cùng 1 bảng đích, hoặc khi tên mặc định gây mơ hồ vai trò:** thêm tiền tố vai trò (role prefix) trước `<referenced_table>_id`.

| Tình huống | Tên cột | Lý do |
|---|---|---|
| `knowledge_edge` có 2 FK tới `knowledge_node` (cạnh có hướng) | `from_knowledge_node_id`, `to_knowledge_node_id` | Không thể dùng `knowledge_node_id` cho cả 2 — bắt buộc tiền tố hướng |
| `roadmap_node` tự tham chiếu (cây, theo cha) | `parent_roadmap_node_id` | **Không dùng `parent_id` trần** — phải gắn `<table_name>` để phân biệt rõ với self-reference khác bản chất ở `knowledge_node` (DAG qua `knowledge_edge`, không có cột tự tham chiếu trực tiếp nào trên `knowledge_node`) — xem [NamingIssueResolution.md](NamingIssueResolution.md) mục 3 |
| `sub_session` phạm vi là 1-trong-2 (`roadmap_node` HOẶC `knowledge_node`) | `roadmap_node_id` (nullable), `knowledge_node_id` (nullable) | Giữ tên mặc định cho từng cột (không trùng bảng đích nên không cần role prefix), nhưng bắt buộc 1 Check Constraint đảm bảo đúng 1 trong 2 có giá trị (mục 7) |

**Tham chiếu đa hình (`trace_link`)** không dùng FK vật lý theo nghĩa thông thường — xem mục 12.

---

## 5. Unique Constraint Naming

**Quyết định: `uq_<table>_<column1>_<column2>...`**

| Ví dụ | Ràng buộc |
|---|---|
| `uq_roadmap_goal_id` | 1 `roadmap` / `goal` (1–1, [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 2) |
| `uq_learning_session_goal_id` | 1 `learning_session` / `goal` (DECISION-028/032) |
| `uq_knowledge_node_mastery_learner_id_knowledge_node_id` | 1 `knowledge_node_mastery` / cặp Learner×KnowledgeNode (khóa cứng ở [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 2) |

**Lý do:** tiền tố `uq_` phân biệt rõ với Index thường (`ix_`, mục 6) ngay trong tên — quan trọng vì Unique Constraint còn mang ý nghĩa nghiệp vụ (toàn vẹn dữ liệu), không chỉ tối ưu hiệu năng như Index. Viết thường, nhất quán `snake_case` toàn schema (không trộn tiền tố hoa với tên cột thường).

---

## 6. Index Naming

**Quyết định: `ix_<table>_<column1>_<column2>...`**

| Ví dụ | Phục vụ Hot Path nào ([DatabaseBlueprint.md](DatabaseBlueprint.md) mục 4) |
|---|---|
| `ix_assessment_result_learner_id_knowledge_node_id` | Hot Path #2 — lịch sử AssessmentResult theo Learner×KnowledgeNode |
| `ix_knowledge_edge_from_knowledge_node_id` / `ix_knowledge_edge_to_knowledge_node_id` | Hot Path #4 — traversal 2 chiều |
| `ix_trace_link_source_type_source_id` / `ix_trace_link_target_type_target_id` | Hot Path #5 — drill-down 2 chiều |

**Lưu ý phạm vi:** tài liệu này chỉ khóa **cách đặt tên** index — **không chọn cột/loại index cụ thể** ở đây (việc đó là Step 4B, dựa trên danh sách Hot Path đã có ở [DatabaseBlueprint.md](DatabaseBlueprint.md) mục 4).

---

## 7. Check Constraint Naming

**Quyết định: `ck_<table>_<column hoặc rule ngắn>`**

| Ví dụ | Ràng buộc |
|---|---|
| `ck_trace_link_source_type` | `source_type` chỉ nhận giá trị trong danh sách đóng (mục 12, [NamingIssueResolution.md](NamingIssueResolution.md) mục 4) |
| `ck_trace_link_target_type` | Tương tự cho `target_type` |
| `ck_sub_session_scope_exactly_one` | Đúng 1 trong `roadmap_node_id`/`knowledge_node_id` có giá trị (mục 4) |
| `ck_evidence_link_stance` | `stance` chỉ nhận `support`/`refute` (xem [NamingIssueResolution.md](NamingIssueResolution.md) mục 5) |

---

## 8. Default Constraint Naming

**Quyết định: `df_<table>_<column>`** — **chỉ mang tính tài liệu/ERD, không phải tên object thực tế trong PostgreSQL.**

PostgreSQL **không có khái niệm named DEFAULT constraint** như SQL Server — `DEFAULT` là thuộc tính trực tiếp của cột (`column_name type DEFAULT <expr>`), không phải object riêng có thể đặt tên/`DROP CONSTRAINT` theo tên. Quy ước `df_*` ở đây dùng để **ghi chú trong tài liệu thiết kế** (ví dụ "`df_learner_created_at`: `created_at` mặc định `now()`"), giúp đối chiếu nhanh khi đọc Blueprint — không xuất hiện trong DDL thực tế của Step 4B.

| Ví dụ (chỉ mang tính tài liệu) | Mặc định |
|---|---|
| `df_learner_created_at` | `created_at DEFAULT now()` |
| `df_recommendation_proposal_status` | `status DEFAULT 'proposed'` |

---

## 9. Temporal Table Naming

> **Cập nhật theo [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md)** — không còn dùng SQL Server System-Versioned Temporal Tables (không tồn tại trong PostgreSQL). Cơ chế: **History Table trigger-maintained**, áp dụng **chỉ cho entity không có companion append-only log sẵn**.

**Phạm vi áp dụng (thu hẹp so với đề xuất ban đầu, theo DECISION-045):**

| Nhóm | Entity | Cơ chế |
|---|---|---|
| **Cần History Table** | `learner`, `knowledge_node`, `discovery_session`, `mentor_session` | Trigger `AFTER UPDATE` ghi row cũ vào `history.<table_name>` |
| **Không cần — đã có companion log** | `roadmap`, `roadmap_node` (qua `approval_record`); `knowledge_node_mastery` (qua `assessment_result`); `learning_session`, `sub_session` (qua transition log khuyến nghị) | Giữ nguyên, không thêm History Table |
| **Không áp dụng — append-only** | `evidence`, `evidence_link`, `assessment_result`, `knowledge_edge`, `expansion_record`, `approval_record`, `self_assessment_mismatch`, `trace_link`, `goal`, `recommendation_proposal` | Bản ghi tự là lịch sử đầy đủ |

**Quyết định đặt tên:**
- Bảng chính: schema `public` (mặc định Supabase), tên không đổi (`public.learner`).
- Bảng lịch sử: **schema riêng `history`, cùng tên bảng** — `history.learner` (giữ nguyên ý tưởng tách namespace đã chốt từ Step 4A.5, chỉ đổi cơ chế duy trì từ "engine tự động" sang "trigger tự viết").
- Cột ghi nhận thời điểm row cũ bị thay: `valid_from` (giữ nguyên tên ý nghĩa, không cần đúng tên `ValidFrom`/`ValidTo` ẩn của SQL Server vì đây không còn là tính năng native — cột tường minh, application/trigger tự quản lý).

---

## 10. Audit Column Naming

**Quyết định — 2 nhóm theo [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 3:**

| Nhóm entity | Cột bắt buộc |
|---|---|
| Append-only (immutable) | `created_at`, `created_by_actor_type` + `created_by_actor_id` |
| Current State Snapshot (mutable) | `created_at`, `created_by_actor_type` + `created_by_actor_id`, `updated_at`, `updated_by_actor_type` + `updated_by_actor_id` |

**Lý do tách `actor_type`/`actor_id` thay vì 1 cột `created_by` đơn:** tác nhân tạo/sửa bản ghi **không luôn là 1 `Learner`** — có thể là AI Service, Backend Core, hoặc 1 domain engine cụ thể ([PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 2). `actor_type` (enum) + `actor_id` (định danh trong phạm vi loại đó) giữ đúng tính đa dạng tác nhân mà không cần FK cứng. Xem [HybridAIArchitectureReview.md](HybridAIArchitectureReview.md) cho đề xuất mở rộng `actor_type` phân biệt Local/Cloud AI (DECISION-046, vẫn là proposal mở, ngoài phạm vi 4 quyết định Platform Alignment).

**Không dùng tên `modified_at`/`modified_by`** — chọn `updated_at`/`updated_by_*` để nhất quán 1 thuật ngữ duy nhất xuyên schema.

---

## 11. Versioning Column Naming

> **Cập nhật theo [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md)** — không còn dùng kiểu dữ liệu native SQL Server `rowversion` (không tồn tại trong PostgreSQL).

**Quyết định: `version_number`** — kiểu `bigint`, `NOT NULL`, `DEFAULT 1`, tăng bằng trigger `BEFORE UPDATE` (`NEW.version_number := OLD.version_number + 1`). Áp dụng tối thiểu cho `knowledge_node_mastery` (rủi ro ghi đồng thời cao nhất, [PersistenceArchitecture.md](PersistenceArchitecture.md) Risk #1) — tùy chọn cho `learner`.

**Không dùng `row_version`** — tránh ngụ ý "tương đương `rowversion`" của SQL Server (bản chất khác: số nguyên nghiệp vụ do trigger quản lý, không phải giá trị nhị phân do engine tự sinh). **Không dùng cột hệ thống ẩn `xmin`** của PostgreSQL — không ổn định lâu dài (bị tái sử dụng sau `VACUUM FREEZE`), không lộ ra qua PostgREST dễ dùng (xem DECISION-044 mục đánh giá).

**Entity append-only không có cột `version_number`** — immutability tự nhiên loại bỏ nhu cầu concurrency token.

---

## 12. Traceability Naming

Theo [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md) (`TraceLink`, không Polymorphic FK rải trên từng entity).

**Quyết định:**

| Cột | Tên | Ghi chú |
|---|---|---|
| Định danh `trace_link` | `trace_link_id` | Theo mục 3 |
| Loại entity nguồn | `source_type` | Enum đóng — danh sách giá trị cố định theo Scope đã chốt ở [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 6 (`assessment_result`, `recommendation_proposal`, `local_expansion`) — **không phải `text` tự do** (giải quyết Naming Issue #2, xem [NamingIssueResolution.md](NamingIssueResolution.md) mục 4) |
| Định danh nguồn | `source_id` | Diễn giải theo `source_type` — không có FK vật lý đơn (bản chất đa hình) |
| Loại entity đích | `target_type` | Enum đóng — `evidence`, `assessment_result`, `discovery_session` |
| Định danh đích | `target_id` | Diễn giải theo `target_type` |

**Không dùng tên `entity_type`/`entity_id` chung cho cả nguồn và đích** — bắt buộc tiền tố `source`/`target` riêng vì 1 `trace_link` luôn có cả 2 chiều cùng lúc, dùng tên chung sẽ không phân biệt được hướng khi đọc dữ liệu thô.

**`source_type`/`target_type` không dùng chung tên `type` với các cột "loại" khác trong hệ thống** (ví dụ `stance` của `evidence_link`, mục 7) — nguyên tắc đặt tên xuyên hệ thống: **"`type`" chỉ dùng cho discriminator loại entity đa hình, không dùng cho hướng/chiều nghiệp vụ** (xem [NamingIssueResolution.md](NamingIssueResolution.md) mục 5).

**Cân nhắc kỹ thuật bổ sung sau Pre-DDL Platform Alignment (không bắt buộc):** PostgreSQL hỗ trợ kiểu `ENUM` native (`CREATE TYPE ... AS ENUM (...)`) — Step 4B có thể chọn `ENUM` thay cho `CHECK` constraint cho `source_type`/`target_type`/`stance` nếu muốn ([SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md) mục 2.5) — đây là tùy chọn nâng cấp, không phải quyết định bắt buộc của tài liệu này.

---

## 13. Liên kết ngược

[DatabaseBlueprint.md](DatabaseBlueprint.md), [DatabaseBlueprintReview.md](DatabaseBlueprintReview.md), [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md), [PHYSICAL_DESIGN_READINESS.md](PHYSICAL_DESIGN_READINESS.md), [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md), [HybridAIArchitectureReview.md](HybridAIArchitectureReview.md), [PLATFORM_ALIGNMENT_REVIEW.md](PLATFORM_ALIGNMENT_REVIEW.md), [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-039](../11_Decisions/DECISION-039-Knowledge-Graph-Persistence.md), [DECISION-042](../11_Decisions/DECISION-042-Database-Naming-Convention-Alignment.md), [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md), [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md).

**Giải quyết chi tiết các Naming Issue phát hiện ở [DatabaseBlueprintReview.md](DatabaseBlueprintReview.md):** xem [NamingIssueResolution.md](NamingIssueResolution.md).

**Vẫn chưa viết SQL/`CREATE TABLE`/danh sách cột chi tiết — đây là quy ước đặt tên (Step 4A.5, đã cập nhật qua Pre-DDL Platform Alignment). Step 4B (DDL Generation) chưa bắt đầu.**
