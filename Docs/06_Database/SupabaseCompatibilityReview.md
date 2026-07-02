# Supabase Compatibility Review — AI Mentor OS

> Database Design Phase — **Pre-DDL Review**, kích hoạt bởi xác nhận của Founder: **Database Platform = Supabase (PostgreSQL)**. Rà soát toàn bộ Decision Log + tài liệu Database Design Step 1-4A.5 ([PersistenceArchitecture.md](PersistenceArchitecture.md), [LogicalDatabaseModel.md](LogicalDatabaseModel.md), [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md), [DatabaseBlueprint.md](DatabaseBlueprint.md), [DatabaseNamingConvention.md](DatabaseNamingConvention.md)) để tìm assumption gắn với SQL Server không còn đúng với PostgreSQL/Supabase.
>
> **Không thiết kế SQL/Table/API ở tài liệu này.**
>
> ## ✅ Cập nhật — Pre-DDL Platform Alignment (đã đóng toàn bộ blocker dưới đây)
>
> 4 đề xuất ở mục 4 (DECISION-042..045) đã được hoàn thiện và khóa. Xem [PLATFORM_ALIGNMENT_REVIEW.md](PLATFORM_ALIGNMENT_REVIEW.md) cho đối chiếu chi tiết + kết luận cuối **READY_FOR_DDL**. Nội dung review gốc dưới đây **giữ nguyên không sửa** (để giữ lại lý do/bối cảnh phân tích ban đầu) — phần "Đề xuất Decision Log" (mục 4) và "DDL Readiness" (mục 5) nay đã lỗi thời, xem ghi chú tại chỗ.

## 0. Bối cảnh quan trọng cần nói trước

Toàn bộ **Domain Architecture** (Round 1-6), **Logical Database Model** (Step 2) và **Database Blueprint** (Step 4A — Entity/Relationship/Aggregate/Lifecycle/Ownership) là **độc lập với hệ quản trị CSDL** — không có entity, quan hệ, cardinality, ownership, hay lifecycle nào trong các tài liệu đó giả định SQL Server. **Không có gì ở 2 tầng này cần sửa.**

Assumption gắn với SQL Server chỉ xuất hiện ở **tầng vật lý cụ thể**: [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) (ID/Audit/Versioning Strategy, mục 7 SQL Server Suitability) và [DatabaseNamingConvention.md](DatabaseNamingConvention.md) (case convention, Temporal Table schema, kiểu dữ liệu `RowVersion`). Đây là phạm vi của review này.

---

## 1. Rà soát theo từng chiến lược (yêu cầu của Task 1)

### 1.1 Temporal Strategy

**Assumption hiện tại:** [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 3/7 và [DatabaseNamingConvention.md](DatabaseNamingConvention.md) mục 9 đề xuất **SQL Server Temporal Tables (System-Versioned)** — tính năng native, engine tự duy trì bảng lịch sử song song (`history.<TableName>`), không cần code thủ công.

**Tương thích PostgreSQL/Supabase:** ❌ **Không có tính năng tương đương native.** PostgreSQL không có System-Versioned Temporal Table built-in; Supabase (managed Postgres) không cung cấp extension nào thay thế tính năng này ở mức engine.

**Phương án thay thế (đã được dự đoán sẵn, không phải phát sinh mới):** [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 3 tự ghi rõ ngay từ Step 3: *"Physical Design cần xác nhận có dùng tính năng SQL Server-specific này hay giữ cách trung lập hệ quản trị (audit log tự viết ở Application Layer)."* — tài liệu đã chủ động để ngỏ phương án dự phòng. Phương án trung lập: **trigger-maintained history table** (Postgres hỗ trợ đầy đủ qua `CREATE TRIGGER ... AFTER UPDATE`, ghi row cũ vào bảng `history.<table_name>` trước khi update) — giữ được cấu trúc 2-schema (`public`/`history`) đã chốt ở Naming Convention, chỉ đổi cơ chế duy trì (trigger thủ công thay vì engine tự động).

**Mức độ ảnh hưởng: Medium.** Không đổi entity/cấu trúc bảng, không đổi schema layout (`history.<table>` vẫn giữ được) — chỉ đổi cơ chế triển khai từ "engine tự động" sang "trigger tự viết". Không phải blocker cho việc thiết kế bảng, nhưng **ảnh hưởng trực tiếp tới DDL** (cần viết thêm trigger function) — phải xác nhận trước khi Step 4B viết DDL cho 9 entity Current State Snapshot.

### 1.2 Versioning Strategy

**Assumption hiện tại:** [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 5 và [DatabaseNamingConvention.md](DatabaseNamingConvention.md) mục 11 đề xuất cột `RowVersion` dùng kiểu dữ liệu native SQL Server `rowversion` (tự tăng mỗi lần row bị sửa, do engine quản lý).

**Tương thích PostgreSQL/Supabase:** ❌ **Không có kiểu dữ liệu `rowversion` trong PostgreSQL.** PostgreSQL có cột hệ thống ẩn `xmin` (transaction ID ghi đè gần nhất) có thể dùng cho optimistic concurrency tương tự, nhưng `xmin` **không ổn định lâu dài** (bị tái sử dụng sau `VACUUM FREEZE`/wraparound) và **không lộ ra qua PostgREST** (API tự sinh của Supabase) theo cách dễ dùng.

**Phương án thay thế:** cột `row_version` kiểu `bigint`, tăng bằng **trigger `BEFORE UPDATE`** (`NEW.row_version = OLD.row_version + 1`) — đơn giản, ổn định, lộ được qua PostgREST như cột thường, Application Layer dùng đúng cách optimistic concurrency tương tự (so sánh giá trị đọc trước khi ghi).

**Mức độ ảnh hưởng: Medium.** Chỉ ảnh hưởng `KnowledgeNodeMastery` (và tùy chọn `Learner`) — phạm vi hẹp, không lan ra toàn schema. Cần 1 trigger function dùng lại được cho mọi bảng cần versioning (viết 1 lần, áp cho nhiều bảng).

### 1.3 Recursive CTE Strategy

**Assumption hiện tại:** [DECISION-039](../11_Decisions/DECISION-039-Knowledge-Graph-Persistence.md) chọn bảng quan hệ (`KnowledgeNode`/`KnowledgeEdge`) + Recursive CTE cho traversal/reachability, **từ chối SQL Server Graph Extensions**.

**Tương thích PostgreSQL/Supabase:** ✅ **Hoàn toàn tương thích, không cần sửa gì.** PostgreSQL hỗ trợ đầy đủ `WITH RECURSIVE ... AS (...)` (cú pháp gần giống SQL Server, chỉ khác bắt buộc viết rõ từ khóa `RECURSIVE` — khác biệt cú pháp viết SQL, không ảnh hưởng thiết kế bảng). Quan trọng hơn: **phương án từng bị từ chối** (SQL Server Graph Extensions, `NODE`/`EDGE` table, `MATCH` clause) **hoàn toàn không tồn tại trong PostgreSQL** — nếu DECISION-039 từng chọn hướng đó, đây mới là điểm phải sửa khẩn cấp. Vì đã chọn hướng bảng quan hệ + Recursive CTE từ đầu (theo triết lý "đơn giản trước" kế thừa DECISION-029), quyết định này **tình cờ đã đúng hướng platform-agnostic** trước khi platform được xác nhận.

**Mức độ ảnh hưởng: None.** Không cần đổi gì — DECISION-039 giữ nguyên, không cần DECISION mới.

### 1.4 Audit Strategy

**Assumption hiện tại:** [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 3 — 2 nhóm (Append-only = audit-by-immutability; Snapshot = audit-by-companion-log/liên kết ngược) + đề xuất Temporal Tables cho nhóm Snapshot (đã xử lý ở mục 1.1).

**Tương thích PostgreSQL/Supabase:** ✅ **Phần lõi (2 nhóm, audit-by-immutability, liên kết ngược bắt buộc tới AssessmentResult/ApprovalRecord) hoàn toàn platform-agnostic** — không có gì trong nguyên tắc này phụ thuộc SQL Server. Chỉ phần "đề xuất cụ thể cho SQL Server" (Temporal Tables) cần thay (đã xử lý ở mục 1.1).

**Cột `CreatedByActorType`/`CreatedByActorId` (Step 4A.5 mục 10):** platform-agnostic, không cần sửa — nhưng xem [HybridAIArchitectureReview.md](HybridAIArchitectureReview.md) cho đề xuất mở rộng enum `ActorType` để phân biệt Local AI/Cloud AI.

**Mức độ ảnh hưởng: None** (ngoài phần Temporal Tables đã tính riêng ở mục 1.1).

---

## 2. Rà soát bổ sung (ngoài 4 chiến lược được yêu cầu, nhưng cần thiết để DDL không sai ngay từ đầu)

### 2.1 ID Strategy (PhysicalDesignPreparation.md mục 2)

**Assumption hiện tại:** Hybrid — ULID-style cho append-only; **`BIGINT IDENTITY` hoặc GUID dùng `NEWSEQUENTIALID()`** cho Current State Snapshot; định danh public riêng (UUID) cho entity lộ ra API.

**Tương thích PostgreSQL/Supabase:** 🔶 **Một phần không tương thích, và có 1 vấn đề tương thích mới phát sinh từ chính Supabase (không phải từ SQL Server→Postgres, mà từ Supabase Auth cụ thể):**

- `NEWSEQUENTIALID()` là hàm **riêng của SQL Server**, không tồn tại trong PostgreSQL. PostgreSQL có `gen_random_uuid()` (built-in từ PG13+, hoặc qua extension `pgcrypto`/`uuid-ossp` ở bản cũ hơn) nhưng đây là UUID v4 **ngẫu nhiên hoàn toàn**, không có tính chất "tuần tự nhẹ" như `NEWSEQUENTIALID()` — quay lại đúng vấn đề phân mảnh clustered index mà `NEWSEQUENTIALID()` từng được chọn để tránh. PostgreSQL 18+ có `uuidv7()` (UUID có timestamp ở đầu, tương tự ULID) — nhưng **chưa chắc Supabase managed Postgres đã lên phiên bản này**, cần kiểm tra thực tế trước khi phụ thuộc vào nó.
- **Vấn đề quan trọng hơn:** Supabase Auth (`auth.users`) dùng **UUID làm khóa chính cho user**, và Row Level Security (RLS) — cơ chế phân quyền cốt lõi của Supabase — luôn so sánh qua `auth.uid()` (trả về UUID). Nếu `Learner` (ánh xạ 1-1 hoặc tham chiếu tới `auth.users`) dùng `BIGINT IDENTITY` làm PK nội bộ thay vì UUID, mọi RLS Policy sẽ phải JOIN qua 1 bảng mapping phụ (`Learner.SupabaseAuthUserId UUID` → tra `LearnerId BIGINT`) thay vì so sánh trực tiếp — **tăng độ phức tạp không cần thiết cho đúng bảng quan trọng nhất** (mọi RLS Policy của hệ thống đều xuất phát từ `Learner`).

**Mức độ ảnh hưởng: High.** Đây là điểm tương thích nghiêm trọng nhất tìm được trong toàn bộ review — không phải vì PostgreSQL khác SQL Server, mà vì **Supabase cụ thể** (RLS + Auth) tạo ràng buộc thực tế lên `Learner.PK`. Cần quyết định lại trước khi viết DDL cho `Learner` và mọi bảng có `LearnerId`/`learner_id` (tức là gần như toàn schema).

### 2.2 Database Naming Convention — Case (PascalCase vs snake_case)

**Assumption hiện tại:** [DatabaseNamingConvention.md](DatabaseNamingConvention.md) mục 0/1/2 chọn **PascalCase** cho Table/Column, lý do "khớp convention SQL Server/.NET tooling".

**Tương thích PostgreSQL/Supabase:** ❌ **Không tương thích về thực hành, dù về kỹ thuật vẫn chạy được.** PostgreSQL fold mọi định danh không có dấu ngoặc kép về chữ thường — nghĩa là viết `LearnerId` mà không quote sẽ tự động biến thành `learnerid` (mất khả năng đọc CamelCase hoàn toàn), nên **bắt buộc phải quote mọi định danh ở mọi câu lệnh** (`"LearnerId"`) nếu giữ PascalCase — rất bất thường trong toàn bộ hệ sinh thái Postgres. Quan trọng hơn: **PostgREST (cơ chế Supabase tự sinh REST API từ schema) và toàn bộ ví dụ/tooling/Supabase Client Library (`supabase-js`, Edge Functions...) đều giả định `snake_case` không quote** — đi ngược chuẩn cộng đồng sẽ gây ma sát ở mọi điểm tích hợp sau này (Apps/backend, Apps/ai-service).

**Mức độ ảnh hưởng: High.** Đây là thay đổi **rộng nhất về diện ảnh hưởng** (chạm mọi tên cột/bảng đã ví dụ trong toàn bộ Database Design Phase) nhưng **hẹp nhất về bản chất** (chỉ đổi case, không đổi cấu trúc/tiền tố/hậu tố đã thiết kế — `LearningSessionId` → `learning_session_id`, `UQ_Roadmap_GoalId` → có thể giữ dạng `roadmap_goal_id_key` theo convention Postgres hoặc giữ tiền tố `uq_roadmap_goal_id` tùy chọn). Toàn bộ logic đặt tên (PK = `<table>_id`, FK role-prefix, Check/Unique/Index pattern, Audit/Versioning/Traceability) ở [DatabaseNamingConvention.md](DatabaseNamingConvention.md) **giữ nguyên giá trị** — chỉ cần áp lại case.

### 2.3 Singular vs Plural Table Naming

**Assumption hiện tại:** Singular (`Learner`, không phải `Learners`).

**Tương thích PostgreSQL/Supabase:** ✅ **Không có ràng buộc kỹ thuật từ platform.** Cộng đồng Supabase/PostgREST không có quy ước bắt buộc số ít/số nhiều (cả 2 đều phổ biến trong ví dụ chính thức của Supabase). Đây là lựa chọn phong cách, không phải vấn đề tương thích.

**Mức độ ảnh hưởng: None.** Giữ nguyên singular — không có lý do platform để đổi.

### 2.4 JSON / kiểu dữ liệu cho Evidence/Reasoning tự do

**Assumption hiện tại:** [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 7 đề xuất `nvarchar(max)` + hàm JSON của SQL Server.

**Tương thích PostgreSQL/Supabase:** ✅ **Tốt hơn, không cần sửa theo hướng giảm chất lượng.** PostgreSQL có `jsonb` (binary JSON, index được qua GIN, hàm truy vấn JSON phong phú hơn SQL Server) — đây là **nâng cấp tự nhiên**, không phải vấn đề tương thích cần giải quyết.

**Mức độ ảnh hưởng: None** (theo hướng tích cực — đổi tên kiểu dữ liệu dự kiến từ `nvarchar(max)` sang `jsonb` khi viết DDL, không cần quyết định mới).

### 2.5 Check Constraint cho Enum đóng (`TraceLink.SourceType`/`TargetType`, `EvidenceLink.Stance`)

**Tương thích PostgreSQL/Supabase:** ✅ **Tương thích hoàn toàn**, PostgreSQL hỗ trợ `CHECK` constraint đầy đủ — và còn có thêm lựa chọn **kiểu `ENUM` native** (`CREATE TYPE ... AS ENUM (...)`) mà SQL Server không có dạng tương đương gọn — đây là **cơ hội nâng cấp tùy chọn**, không phải vấn đề bắt buộc sửa.

**Mức độ ảnh hưởng: None.**

### 2.6 Soft Delete Strategy

**Tương thích PostgreSQL/Supabase:** ✅ Hoàn toàn platform-agnostic (Anonymize/Superseded/Archived là trạng thái nghiệp vụ, không phụ thuộc engine).

**Mức độ ảnh hưởng: None.**

---

## 3. Tổng hợp theo yêu cầu Output

### 3.1 Những gì cần sửa

| # | Hạng mục | Tóm tắt |
|---|---|---|
| 1 | ID Strategy (mục 2.1) | `NEWSEQUENTIALID()`/`BIGINT IDENTITY` cho nhóm Snapshot không tương thích; `Learner` cần xem lại quan hệ với `auth.users` (UUID) vì RLS |
| 2 | Database Naming Convention — Case (mục 2.2) | PascalCase → snake_case cho Table/Column (và theo đó mọi ví dụ PK/FK/Constraint/Index/Audit/Versioning/Traceability) |
| 3 | Temporal Strategy (mục 1.1) | SQL Server Temporal Tables → trigger-maintained history table (giữ schema `history`, đổi cơ chế) |
| 4 | Versioning Strategy (mục 1.2) | `rowversion` → cột `row_version bigint` + trigger tăng thủ công |

### 3.2 Những gì giữ nguyên

| # | Hạng mục | Lý do |
|---|---|---|
| 1 | Toàn bộ Domain Architecture (Round 1-6) | Platform-agnostic, không entity/quan hệ nào giả định SQL Server |
| 2 | Toàn bộ Logical Database Model (Step 2) | Platform-agnostic |
| 3 | Toàn bộ Database Blueprint (Step 4A) — Entity/Relationship Matrix/Database Modules | Platform-agnostic |
| 4 | Recursive CTE Strategy ([DECISION-039](../11_Decisions/DECISION-039-Knowledge-Graph-Persistence.md)) | PostgreSQL hỗ trợ đầy đủ `WITH RECURSIVE`; phương án từng bị từ chối (Graph Extensions) còn kém tương thích hơn |
| 5 | Audit Strategy — phần nguyên tắc (2 nhóm, audit-by-immutability/companion-log) | Platform-agnostic, chỉ phần triển khai cụ thể (Temporal Tables) cần đổi |
| 6 | Singular Table Naming | Không có ràng buộc platform |
| 7 | Soft Delete Strategy | Platform-agnostic |
| 8 | Toàn bộ cấu trúc đặt tên (tiền tố/hậu tố PK/FK/Unique/Index/Check/Default/Audit/Versioning/Traceability) ở [DatabaseNamingConvention.md](DatabaseNamingConvention.md) | Chỉ cần đổi case, không đổi logic đặt tên |
| 9 | 5 giải pháp Naming Issue ở [NamingIssueResolution.md](NamingIssueResolution.md) | Platform-agnostic (đặt tên/ngữ nghĩa, không phụ thuộc engine) |

### 3.3 Những gì phát sinh mới

| # | Phát sinh | Loại |
|---|---|---|
| 1 | Quan hệ `Learner` ↔ `auth.users` (Supabase Auth) — chưa từng xuất hiện trong Domain Architecture vì Domain Architecture không biết platform | Câu hỏi mới, cần Founder/ChatGPT xác nhận trước DDL |
| 2 | Nhu cầu 1 trigger function tái sử dụng được cho Temporal History + Versioning (2 cơ chế đều cần trigger) | Chi tiết kỹ thuật Step 4B, không phải entity/domain mới |
| 3 | Cơ hội dùng Postgres `ENUM` type thay Check Constraint cho `SourceType`/`TargetType`/`Stance` | Tùy chọn nâng cấp, không bắt buộc |

**Không phát sinh entity/aggregate/domain mới nào từ việc đổi platform CSDL** — toàn bộ phát sinh đều ở tầng triển khai vật lý.

### 3.4 Mức độ ảnh hưởng (tổng hợp)

| Hạng mục | Mức độ |
|---|---|
| ID Strategy / quan hệ với Supabase Auth | **High** |
| Database Naming Convention (case) | **High** |
| Temporal Strategy | Medium |
| Versioning Strategy | Medium |
| Recursive CTE Strategy | None |
| Audit Strategy (nguyên tắc) | None |
| JSON/kiểu dữ liệu tự do | None (tích cực) |
| Enum/Check Constraint | None |
| Soft Delete | None |
| Domain/Logical/Blueprint Architecture | None |

---

## 4. Đề xuất Decision Log (TASK 3 — chỉ đề xuất, không tự chốt) — *⚠️ đã chốt, xem [PLATFORM_ALIGNMENT_REVIEW.md](PLATFORM_ALIGNMENT_REVIEW.md)*

> Bảng dưới đây giữ nguyên nội dung đề xuất gốc cho mục đích lịch sử/bối cảnh. **Cả 4 đề xuất đã được hoàn thiện thành quyết định khóa** ([DECISION-042](../11_Decisions/DECISION-042-Database-Naming-Convention-Alignment.md), [043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md), [044](../11_Decisions/DECISION-044-Versioning-Strategy.md), [045](../11_Decisions/DECISION-045-Temporal-Strategy.md)) — không còn ở trạng thái "chờ xác nhận".

| Đề xuất | Nội dung cần Founder/ChatGPT xác nhận |
|---|---|
| **DECISION-042 (đề xuất)** | Database Naming Convention Revision for PostgreSQL/Supabase — đổi case Table/Column từ PascalCase sang `snake_case`, giữ nguyên toàn bộ logic tiền tố/hậu tố (PK/FK/Unique/Index/Check/Default/Audit/Versioning/Traceability) đã chốt ở [DatabaseNamingConvention.md](DatabaseNamingConvention.md), chỉ áp lại case |
| **DECISION-043 (đề xuất)** | ID Strategy Revision for Supabase — xác nhận: (a) `Learner` có map trực tiếp 1-1 với `auth.users.id` (dùng chung UUID, không có PK nội bộ riêng) hay có PK riêng + FK UUID riêng tới `auth.users`; (b) thay `NEWSEQUENTIALID()`/`BIGINT IDENTITY` bằng UUID (`gen_random_uuid()` hoặc `uuidv7()` nếu Supabase hỗ trợ) cho nhóm Current State Snapshot |
| **DECISION-044 (đề xuất)** | Temporal/History Strategy Revision for PostgreSQL — xác nhận dùng trigger-maintained history table (schema `history`, giữ tên bảng) thay cho System-Versioned Temporal Tables |
| **DECISION-045 (đề xuất)** | Versioning Strategy Revision for PostgreSQL — xác nhận dùng cột `row_version bigint` + trigger thay cho kiểu `rowversion` |

**Không đề xuất sửa DECISION-039** (Recursive CTE Strategy) — vẫn hợp lệ nguyên trạng cho PostgreSQL.

## 5. DDL Readiness

**NOT_READY_FOR_DDL** *(trạng thái tại thời điểm review này — ⚠️ đã thay đổi, xem cập nhật)*

Lý do (lúc viết review này): 2/4 hạng mục ở mục 3.4 có mức ảnh hưởng **High** (ID Strategy/Supabase Auth, Naming Convention case) — cả hai đều **thay đổi trực tiếp những gì Step 4B sẽ viết ra** (kiểu dữ liệu PK/FK của gần như mọi bảng; case của mọi tên cột/bảng).

**Domain Architecture, Logical Database Model, và Database Blueprint (Step 4A) không cần xem lại** — đây là tin tốt: toàn bộ công sức thiết kế entity/quan hệ/ownership/lifecycle từ Round 1 tới Step 4A **vẫn còn nguyên giá trị**, không có gì phải làm lại ở tầng đó. **Điều này vẫn đúng sau khi 4 quyết định được khóa.**

> ## ✅ Cập nhật cuối: **READY_FOR_DDL**
>
> Sau Pre-DDL Platform Alignment, [DECISION-042](../11_Decisions/DECISION-042-Database-Naming-Convention-Alignment.md)..[045](../11_Decisions/DECISION-045-Temporal-Strategy.md) đã khóa toàn bộ 4 blocker liệt kê ở trên. Xem [PLATFORM_ALIGNMENT_REVIEW.md](PLATFORM_ALIGNMENT_REVIEW.md) cho đối chiếu đầy đủ và kết luận readiness chính thức (thay thế kết luận NOT_READY_FOR_DDL ở trên).

## Liên kết ngược

[PersistenceArchitecture.md](PersistenceArchitecture.md), [LogicalDatabaseModel.md](LogicalDatabaseModel.md), [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md), [DatabaseBlueprint.md](DatabaseBlueprint.md), [DatabaseNamingConvention.md](DatabaseNamingConvention.md), [NamingIssueResolution.md](NamingIssueResolution.md), [DECISION-039](../11_Decisions/DECISION-039-Knowledge-Graph-Persistence.md), [HybridAIArchitectureReview.md](HybridAIArchitectureReview.md), [PLATFORM_ALIGNMENT_REVIEW.md](PLATFORM_ALIGNMENT_REVIEW.md).
