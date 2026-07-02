# DECISION-042 — Database Naming Convention Alignment: `snake_case` for PostgreSQL/Supabase

- **Status:** Accepted (Locked) — closes [SupabaseCompatibilityReview.md](../06_Database/SupabaseCompatibilityReview.md) mục 3.1 #2 (High impact), supersedes case convention in [DatabaseNamingConvention.md](../06_Database/DatabaseNamingConvention.md) mục 0-2
- **Date:** 2026-06-27 (Database Design Phase, Pre-DDL Platform Alignment)

## Context

[DatabaseNamingConvention.md](../06_Database/DatabaseNamingConvention.md) (Step 4A.5) khóa **PascalCase** cho Table/Column, với lý do "khớp convention SQL Server/.NET tooling" — lý do này không còn đúng sau khi Founder xác nhận **Database Platform = Supabase (PostgreSQL)**. [SupabaseCompatibilityReview.md](../06_Database/SupabaseCompatibilityReview.md) mục 2.2 xác định đây là 1 trong 2 điểm ảnh hưởng **High**, cần quyết định lại trước khi Step 4B viết DDL.

## Decision

**Đổi case convention từ PascalCase sang `snake_case`** cho **toàn bộ Table và Column** — giữ nguyên mọi logic cấu trúc đặt tên khác đã chốt ở [DatabaseNamingConvention.md](../06_Database/DatabaseNamingConvention.md) (PK `<table>_id`, FK role-prefix, Unique/Index/Check prefix, Audit/Traceability column set), chỉ đổi case.

### Đánh giá `snake_case` vs `PascalCase` trong bối cảnh PostgreSQL/Supabase/PostgREST/API tương lai

| Tiêu chí | `snake_case` | `PascalCase` |
|---|---|---|
| **PostgreSQL identifier folding** | Không cần quote — PostgreSQL fold định danh không quote về chữ thường, `learner_id` viết ra sao đọc lại đúng vậy | Bắt buộc quote (`"LearnerId"`) ở **mọi nơi** (mọi câu SQL, mọi view, mọi function, mọi RLS Policy) — quên 1 lần là lỗi hoặc fold sai thành `learnerid` (mất khả năng đọc) |
| **Cộng đồng/tooling PostgreSQL nói chung** | Convention chuẩn — `psql`, `pg_dump`, mọi tài liệu PostgreSQL chính thức dùng `snake_case` không quote | Lệch chuẩn — đi ngược thực hành phổ biến, tăng ma sát khi đọc lỗi/log hệ thống, khi dùng `psql` trực tiếp debug |
| **PostgREST (cơ chế Supabase tự sinh REST API từ schema)** | PostgREST đọc tên cột/bảng trực tiếp làm key JSON trả về (`{"learner_id": ...}`) — hoạt động tự nhiên không cần quote, không cần cấu hình thêm | PostgREST vẫn **kỹ thuật** trả về đúng tên đã quote (`{"LearnerId": ...}`) nếu bảng được tạo có quote nhất quán — nhưng đây là cách dùng PostgREST **ngược chiều** với toàn bộ ví dụ/tài liệu chính thức của Supabase, tăng rủi ro 1 migration/script nào đó quên quote và gây lỗi runtime khó debug |
| **`supabase-js` / Supabase Client Library** | Toàn bộ ví dụ chính thức, generated TypeScript types (`supabase gen types`), Edge Functions đều giả định `snake_case` ở tầng DB | Không có hỗ trợ/ví dụ chính thức — phải tự xử lý mapping ở mọi điểm gọi API |
| **Future API generation (tầng API/Frontend, [07_API](../../07_API/README.md) chưa bắt đầu)** | Tầng DB và tầng API **tách biệt rõ ràng** — nếu Frontend (thường dùng `camelCase` theo convention JS/TS) cần case khác, đây là **trách nhiệm của tầng API/Client** (qua `supabase gen types` có tùy chọn transform, hoặc 1 lớp mapping mỏng ở Backend/AI Service), không phải trách nhiệm của tầng DB | Cùng vấn đề nhưng không có lý do platform nào để chọn PascalCase ở tầng DB chỉ để "gần" với 1 convention Frontend — tầng DB nên tối ưu cho chính platform của nó (PostgreSQL/Supabase), không tối ưu cho tầng tiêu thụ phía trên |
| **Tính nhất quán với Domain/Logical Model (đặt tên PascalCase, ví dụ `Learner`, `KnowledgeNode`)** | Cần 1 bước "dịch case" có quy tắc rõ (PascalCase entity name → `snake_case` table/column name) — đơn giản, máy móc, không mất thông tin (`KnowledgeNode` → `knowledge_node`, `KnowledgeNodeId` → `knowledge_node_id`) | Không cần bước dịch — nhưng lợi ích này **không đủ bù** cho toàn bộ bất lợi vận hành thực tế trên PostgreSQL/Supabase ở các dòng trên |

**Kết luận đánh giá:** không có tiêu chí nào ở bảng trên nghiêng về PascalCase khi platform là PostgreSQL/Supabase — PascalCase chỉ có lợi thế duy nhất là "khớp tên entity logic", một lợi ích thuần biên tập, có thể đạt được bằng 1 quy tắc dịch case đơn giản, không cần đánh đổi toàn bộ tính tương thích platform.

## Khuyến nghị cuối cùng (Final Recommendation)

**`snake_case` cho Table và Column — không có ngoại lệ.**

- **Table Naming:** giữ nguyên **singular** (theo [DatabaseNamingConvention.md](../06_Database/DatabaseNamingConvention.md) mục 1, không platform-dependent) — chỉ đổi case: `Learner` → `learner`, `KnowledgeNode` → `knowledge_node`, `AssessmentResult` → `assessment_result`, `TraceLink` → `trace_link`.
- **Column Naming:** `LearnerId` → `learner_id`, `CreatedAt` → `created_at`, `KnowledgeNodeId` → `knowledge_node_id`.
- **PK Naming (mục 3 cũ):** `<table>_id` — `learning_session_id`, `knowledge_node_id`.
- **FK Naming (mục 4 cũ):** mặc định cùng tên PK tham chiếu (`goal_id`, `learner_id`); role-prefix khi cần (`from_knowledge_node_id`, `to_knowledge_node_id`, `parent_roadmap_node_id`).
- **Unique/Index/Check Constraint Naming:** giữ tiền tố đã chọn nhưng **viết thường**: `uq_roadmap_goal_id`, `ix_assessment_result_learner_id_knowledge_node_id`, `ck_trace_link_source_type` — nhất quán toàn bộ `snake_case`, không trộn tiền tố hoa (`UQ_`) với tên cột thường.
- **Default Constraint Naming:** giữ ghi nhận `df_<table>_<column>` cho mục đích tài liệu/ERD, nhưng lưu ý PostgreSQL **không có khái niệm named DEFAULT constraint** như SQL Server (`DEFAULT` là thuộc tính trực tiếp của cột, không phải object riêng có thể đặt tên) — tên `df_*` ở đây chỉ mang tính tham chiếu trong tài liệu thiết kế, không phải tên object thực tế sẽ xuất hiện trong DDL.
- **Traceability Naming:** `trace_link_id`, `source_type`, `source_id`, `target_type`, `target_id`.
- **Audit Column Naming:** `created_at`, `created_by_actor_type`, `created_by_actor_id`, `updated_at`, `updated_by_actor_type`, `updated_by_actor_id`.
- **Temporal/Versioning column naming:** quyết định riêng ở [DECISION-044](DECISION-044-Versioning-Strategy.md)/[DECISION-045](DECISION-045-Temporal-Strategy.md) — áp dụng `snake_case` nhất quán theo quyết định này khi đặt tên cụ thể.

**Tầng API/Frontend (chưa bắt đầu, [07_API](../../07_API/README.md)):** nếu cần `camelCase` ở phía Frontend/TypeScript, xử lý bằng 1 lớp transform tại tầng API (ví dụ tùy chọn case-transform của `supabase gen types`, hoặc mapping layer ở Backend/AI Service) — **không** ảnh hưởng ngược lại tên cột/bảng trong PostgreSQL. Đây là ghi chú định hướng cho giai đoạn API Design sau này, không phải quyết định của tài liệu này.

## Consequences

- [DatabaseNamingConvention.md](../06_Database/DatabaseNamingConvention.md) cần cập nhật toàn bộ ví dụ từ PascalCase sang `snake_case` (mục 0-12) — cấu trúc/tiền tố/hậu tố giữ nguyên, chỉ đổi case.
- [NamingIssueResolution.md](../06_Database/NamingIssueResolution.md) cần cập nhật ví dụ cột (`ExplainLevel` → `explain_level`, `TeachExplainScore` → `teach_explain_score`, `EvidenceWeight` → `evidence_weight`, `Stance` → `stance`...) — quy tắc giải quyết ambiguity giữ nguyên, chỉ đổi case.
- [DatabaseBlueprint.md](../06_Database/DatabaseBlueprint.md) không cần đổi entity/quan hệ — chỉ cần hiểu rằng mọi tên cột minh họa trong tài liệu (nếu có) sẽ theo `snake_case` ở Step 4B.
- Đóng điểm ảnh hưởng High #2 ở [SupabaseCompatibilityReview.md](../06_Database/SupabaseCompatibilityReview.md) mục 3.1/3.4.
- Không ảnh hưởng Domain Architecture/Logical Database Model — quyết định này chỉ ở tầng vật lý/đặt tên.

## Related Documents

- [DatabaseNamingConvention.md](../06_Database/DatabaseNamingConvention.md)
- [NamingIssueResolution.md](../06_Database/NamingIssueResolution.md)
- [SupabaseCompatibilityReview.md](../06_Database/SupabaseCompatibilityReview.md)
- [PLATFORM_ALIGNMENT_REVIEW.md](../06_Database/PLATFORM_ALIGNMENT_REVIEW.md)
