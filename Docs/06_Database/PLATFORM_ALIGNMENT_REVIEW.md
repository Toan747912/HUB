# Platform Alignment Review — AI Mentor OS

> Database Design Phase — **Pre-DDL Platform Alignment**. Tổng hợp 4 quyết định vừa khóa ([DECISION-042](../11_Decisions/DECISION-042-Database-Naming-Convention-Alignment.md)..[045](../11_Decisions/DECISION-045-Temporal-Strategy.md)) để trả lời 1 câu hỏi duy nhất: **toàn bộ blocker do [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md) xác định đã được giải quyết chưa — có thể bắt đầu Step 4B (DDL Generation) chưa?**

## 1. Đối chiếu từng blocker

| Blocker (từ [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md)) | Mức ảnh hưởng ban đầu | Quyết định đóng | Trạng thái |
|---|---|---|---|
| Database Naming Convention case (PascalCase đi ngược `snake_case` của PostgreSQL/PostgREST) | High | [DECISION-042](../11_Decisions/DECISION-042-Database-Naming-Convention-Alignment.md) — `snake_case` cho Table/Column, giữ nguyên cấu trúc tiền tố/hậu tố | ✅ Đóng |
| ID Strategy / quan hệ `Learner` ↔ Supabase Auth (`NEWSEQUENTIALID()`/`BIGINT IDENTITY` xung đột RLS UUID) | High | [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md) — `learner.id = auth.users.id` (UUID chung, không mapping riêng) | ✅ Đóng |
| Versioning Strategy (`rowversion` không tồn tại trong PostgreSQL) | Medium | [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md) — `version_number` (bigint, trigger-incremented) | ✅ Đóng |
| Temporal Strategy (System-Versioned Temporal Tables không tồn tại trong PostgreSQL) | Medium | [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md) — History Table trigger-maintained, chỉ nơi không có companion log | ✅ Đóng |

**Cả 4 blocker đã biết tại thời điểm [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md) đều đã có quyết định khóa.** Không còn điểm nào trong 4 mục đó ở trạng thái "đề xuất chờ xác nhận" — toàn bộ đã chuyển từ *proposal* sang *Accepted (Locked)*.

## 2. Rà soát chéo — 4 quyết định có mâu thuẫn nhau hay với Decision Log cũ không?

| Cặp kiểm tra | Kết quả |
|---|---|
| DECISION-042 (snake_case) × DECISION-043 (Supabase Auth) | Không mâu thuẫn — DECISION-043 dùng tên cột `learner.id`/`learner_id` đúng `snake_case` đã chốt ở 042 |
| DECISION-043 (Learner = UUID) × DECISION-044 (`version_number` cho `knowledge_node_mastery`) | Không mâu thuẫn — `knowledge_node_mastery.learner_id` là UUID (theo 043), `version_number` là cột riêng biệt, không phụ thuộc kiểu dữ liệu của `learner_id` |
| DECISION-044 (Versioning) × DECISION-045 (Temporal) | Không trùng lặp phạm vi — Versioning áp dụng cho `knowledge_node_mastery` (và tùy chọn `learner`); Temporal/History Table áp dụng cho `learner`, `knowledge_node`, `discovery_session`, `mentor_session` (nhóm không có companion log). `learner` là entity duy nhất xuất hiện ở cả 2 — không xung đột, vì 2 cơ chế độc lập (1 cột đếm version, 1 trigger ghi lịch sử) có thể cùng tồn tại trên 1 bảng |
| DECISION-043 (`ON DELETE RESTRICT` cho `learner.id REFERENCES auth.users`) × [DECISION-037](../11_Decisions/DECISION-037-Right-To-Be-Forgotten-Anonymization.md) (Anonymization, không Hard Delete) | Nhất quán — DECISION-043 mục Khuyến nghị #3 viết rõ ràng buộc này chính là để **bảo vệ** DECISION-037, không vi phạm |
| DECISION-045 (History Table chỉ nơi không có companion log) × [PersistenceArchitecture.md](PersistenceArchitecture.md) mục 2 quyết định #2 ("không bao giờ chỉ lưu state hiện tại mà xóa lịch sử") | Nhất quán — DECISION-045 không xóa cơ chế lịch sử nào đã có (companion log), chỉ bổ sung đúng nơi còn thiếu |

**Không phát hiện mâu thuẫn nào giữa 4 quyết định mới với nhau hoặc với Decision Log đã khóa trước đó.**

## 3. Tổng hợp theo yêu cầu Output

### 3.1 Những gì cần sửa (đã sửa qua 4 Decision)

| # | Tài liệu | Thay đổi |
|---|---|---|
| 1 | [DatabaseNamingConvention.md](DatabaseNamingConvention.md) | Case PascalCase → `snake_case` (toàn bộ mục 0-12); cột Versioning đổi tên `RowVersion` → `version_number`; cơ chế Temporal đổi từ System-Versioned sang trigger-maintained, thu hẹp danh sách entity áp dụng |
| 2 | [NamingIssueResolution.md](NamingIssueResolution.md) | Mọi ví dụ cột đổi case sang `snake_case` (`ExplainLevel` → `explain_level`, `EvidenceWeight` → `evidence_weight`, `Stance` → `stance`...) — logic giải quyết ambiguity giữ nguyên |
| 3 | [DatabaseBlueprint.md](DatabaseBlueprint.md) | Mục 1.1 (`Learner`): PK Strategy đổi thành UUID chia sẻ với `auth.users.id`, bỏ Public ID riêng; mục 1.11 (`KnowledgeNodeMastery`): Versioning đổi thành `version_number`; Temporal Requirement của `roadmap`/`roadmap_node`/`knowledge_node_mastery`/`learning_session`/`sub_session` đổi thành "không cần History Table riêng (đã có companion log)" |
| 4 | [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md) | Mục 3.1/3.4/5 cập nhật trạng thái 4 blocker từ "cần sửa" sang "đã đóng bởi DECISION-042..045" |

### 3.2 Những gì giữ nguyên

- **Toàn bộ Domain Architecture (Round 1-6)** — không entity/quan hệ/aggregate nào bị đổi bởi 4 quyết định này.
- **Toàn bộ Logical Database Model (Step 2) và Relationship Matrix/Database Modules ở Database Blueprint (Step 4A)** — chỉ đổi thuộc tính vật lý (kiểu dữ liệu, case, cơ chế lưu lịch sử), không đổi cardinality/ownership/lifecycle.
- **Cấu trúc tiền tố/hậu tố đặt tên** (PK `<table>_id`, FK role-prefix, Unique/Index/Check pattern, Audit `created_at`/`*_actor_type`/`*_actor_id`, Traceability `source_type`/`source_id`/`target_type`/`target_id`) — chỉ đổi case theo DECISION-042, logic giữ nguyên 100%.
- **5 giải pháp Naming Issue ở [NamingIssueResolution.md](NamingIssueResolution.md)** — vẫn đúng, chỉ đổi case ví dụ.
- **[DECISION-039](../11_Decisions/DECISION-039-Knowledge-Graph-Persistence.md)** (Knowledge Graph = bảng quan hệ + Recursive CTE) — không bị ảnh hưởng bởi 4 quyết định này, đã xác nhận tương thích PostgreSQL từ [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md) mục 1.3.
- **[HybridAIArchitectureReview.md](HybridAIArchitectureReview.md)** và đề xuất DECISION-046 — ngoài phạm vi 4 quyết định này (Hybrid AI), chưa được xử lý ở review này, **vẫn là proposal mở**.

### 3.3 Những gì phát sinh mới

| # | Phát sinh | Loại |
|---|---|---|
| 1 | Ràng buộc thứ tự thao tác ở tầng Application Layer: phải Anonymize `learner` **trước** khi xóa `auth.users` (DECISION-043 mục Khuyến nghị #3) | Yêu cầu nghiệp vụ mới cho Backend, không phải entity/bảng mới |
| 2 | Thu hẹp phạm vi History Table từ 9 xuống 4 entity (`learner`, `knowledge_node`, `discovery_session`, `mentor_session`) — ít hơn dự kiến ban đầu | Điều chỉnh tài liệu, giảm phạm vi công việc Step 4B, không phát sinh entity mới |
| 3 | 1 trigger function generic cho Versioning (tái dùng cho `knowledge_node_mastery`, tùy chọn `learner`) và 1 trigger function generic cho History Table (tái dùng cho 4 entity ở mục 2) | Chi tiết kỹ thuật Step 4B, không phải entity/domain mới |

**Không phát sinh entity/aggregate/domain mới nào** — toàn bộ phát sinh đều ở tầng triển khai vật lý/quy trình ứng dụng.

### 3.4 Mức độ ảnh hưởng (sau khi đã quyết định)

| Hạng mục | Mức độ còn lại |
|---|---|
| Database Naming Convention case | **None** — đã đóng bởi DECISION-042 |
| ID Strategy / Supabase Auth Alignment | **None** — đã đóng bởi DECISION-043 (còn 1 yêu cầu Application Layer cần Backend triển khai đúng thứ tự, không phải rủi ro thiết kế) |
| Versioning Strategy | **None** — đã đóng bởi DECISION-044 |
| Temporal Strategy | **None** — đã đóng bởi DECISION-045 |
| Hybrid AI (DECISION-046, ngoài phạm vi review này) | **Low** — không chặn DDL cho 19 entity hiện có, chỉ ảnh hưởng 1 enum (`actor_type`), xem [HybridAIArchitectureReview.md](HybridAIArchitectureReview.md) |

## 4. DDL Readiness

**READY_FOR_DDL**

Lý do:
- Cả 4 blocker mức **High/Medium** từ [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md) đã có quyết định khóa, không còn ở trạng thái proposal.
- Rà soát chéo (mục 2) không phát hiện mâu thuẫn nào giữa 4 quyết định mới hoặc với Decision Log đã khóa trước đó.
- Domain Architecture, Logical Database Model, và Database Blueprint (Step 4A) không cần sửa entity/quan hệ nào — toàn bộ thay đổi nằm ở tầng vật lý (kiểu dữ liệu, case, cơ chế lịch sử/versioning).
- [DECISION-039](../11_Decisions/DECISION-039-Knowledge-Graph-Persistence.md) (Recursive CTE) đã xác nhận tương thích, không cần xem lại.

**Lưu ý duy nhất còn mở (không chặn DDL cho 19 entity hiện có):** [HybridAIArchitectureReview.md](HybridAIArchitectureReview.md)/DECISION-046 (mở rộng enum `actor_type` cho Local/Cloud AI) vẫn là proposal — khuyến nghị xác nhận **trước khi** Step 4B viết cụ thể CHECK constraint/enum cho cột `created_by_actor_type`/`updated_by_actor_type`, để tránh phải `ALTER TYPE`/migration sau, nhưng **không cần trì hoãn toàn bộ Step 4B** vì lý do này.

**Có thể bắt đầu Step 4B — DDL Generation**, áp dụng đầy đủ [DatabaseNamingConvention.md](DatabaseNamingConvention.md) (đã cập nhật theo DECISION-042/044/045) và [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md) cho `learner`/mọi FK `learner_id`.

## Liên kết ngược

[SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md), [HybridAIArchitectureReview.md](HybridAIArchitectureReview.md), [DatabaseNamingConvention.md](DatabaseNamingConvention.md), [NamingIssueResolution.md](NamingIssueResolution.md), [DatabaseBlueprint.md](DatabaseBlueprint.md), [DECISION-042](../11_Decisions/DECISION-042-Database-Naming-Convention-Alignment.md), [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md), [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md).
