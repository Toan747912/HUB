# SQL Batch 0 Review — Infrastructure

> Review của [SQL_BATCH0_INFRASTRUCTURE.sql](SQL_BATCH0_INFRASTRUCTURE.sql) — batch SQL thật đầu tiên được sinh ra trong toàn bộ project. Đối chiếu lại [SQL_GENERATION_MASTER_PLAN.md](SQL_GENERATION_MASTER_PLAN.md) mục 2/6/7/8, [POSTGRESQL_FEATURE_MATRIX.md](POSTGRESQL_FEATURE_MATRIX.md), [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md), [DECISION-050](../11_Decisions/DECISION-050-SQL-PreGeneration-Finalization.md).

## 1. Nội dung đã sinh

| # | Hạng mục | Trạng thái |
|---|---|---|
| 1 | `CREATE EXTENSION IF NOT EXISTS pgcrypto` | ✅ Sinh |
| 2 | `CREATE SCHEMA IF NOT EXISTS history` + REVOKE/GRANT khóa quyền truy cập | ✅ Sinh |
| 3 | `fn_set_updated_at()` | ✅ Sinh |
| 4 | `fn_increment_version_number()` | ✅ Sinh |
| 5 | `fn_write_history()` | ✅ Sinh |
| — | `CREATE TABLE` cho bất kỳ business entity nào | ❌ Không có — đúng phạm vi được giao |
| — | `CREATE POLICY`/`ENABLE ROW LEVEL SECURITY` | ❌ Không có — đúng phạm vi được giao |

**Không có bảng nghiệp vụ, không có Domain table, không có RLS** — khớp 100% yêu cầu "infrastructure only".

---

## 2. PostgreSQL Compatibility

| Điểm | Đánh giá |
|---|---|
| `gen_random_uuid()` | Built-in từ PostgreSQL 13+ (Supabase chạy PG14+) — không phụ thuộc extension nào để hoạt động đúng. `pgcrypto` được enable **chỉ để phòng hộ tương thích**, không phải yêu cầu chức năng bắt buộc — ghi rõ trong comment SQL, không gây hiểu nhầm là "bắt buộc" |
| `CREATE SCHEMA IF NOT EXISTS` / `CREATE EXTENSION IF NOT EXISTS` / `CREATE OR REPLACE FUNCTION` | Toàn bộ statement đều idempotent — chạy lại không lỗi, không trùng lặp side-effect — an toàn cho migration tooling chạy nhiều lần (vd CI re-apply) |
| `fn_write_history()` — `EXECUTE format('... %I.%I ...') USING OLD` | Cú pháp Dynamic SQL hợp lệ PostgreSQL chuẩn (`format()` + `%I` identifier-quote + `USING` truyền `OLD` làm parameter có kiểu). Cast `($1::%I.%I).*` dựa trên tính chất PostgreSQL: **mọi table tự động có 1 composite type cùng tên** — đây là kỹ thuật generic trigger phổ biến, không dùng tính năng experimental/deprecated nào |
| `ALTER DEFAULT PRIVILEGES IN SCHEMA history` | Cú pháp chuẩn PostgreSQL — áp dụng cho **các bảng được tạo sau này** trong schema `history` (chưa tồn tại bảng nào lúc Batch 0 chạy) — đúng mục đích "khóa quyền trước khi có bảng" |
| Không dùng tính năng PG-version-specific nào mới hơn baseline Supabase (PG14+) | ✅ Không `MERGE` (PG15+), không cần — không dùng tính năng nào yêu cầu PG version cụ thể vượt baseline |

**Không phát hiện vấn đề tương thích PostgreSQL nào.**

---

## 3. Supabase Compatibility

| Điểm | Đánh giá |
|---|---|
| `pgcrypto` | Supabase mặc định đã enable extension này ở mọi project mới — `IF NOT EXISTS` đảm bảo không lỗi nếu đã tồn tại |
| Schema `history` không expose qua PostgREST | Supabase API chỉ expose schema được khai báo tường minh trong cấu hình API (mặc định `public`, `graphql_public`) — `history` **không tự động lộ ra** dù không có REVOKE nào. REVOKE/GRANT ở Batch 0 là **lớp phòng hộ bổ sung** (defense-in-depth), không phải điều kiện duy nhất đảm bảo an toàn — ghi rõ để không hiểu nhầm "REVOKE là cơ chế chặn duy nhất" |
| Role `service_role`/`PUBLIC` | Cả 2 là role có sẵn trong mọi Supabase project (Supabase tạo `anon`/`authenticated`/`service_role` mặc định) — không cần `CREATE ROLE` nào, không rủi ro "role không tồn tại" |
| Trigger function `LANGUAGE plpgsql` | `plpgsql` luôn có sẵn trong Supabase managed Postgres — không cần `CREATE EXTENSION plpgsql` (đã built-in từ Postgres lõi) |

**Không phát hiện vấn đề tương thích Supabase nào.**

---

## 4. Validation — No dependency on business tables / RLS / application code

| Yêu cầu | Xác nhận |
|---|---|
| **No dependency on business tables** | ✅ Đúng — `fn_write_history()` không hardcode tên bảng nào, dùng `TG_TABLE_NAME`/`TG_TABLE_SCHEMA` (runtime, suy ra từ bảng đang gắn trigger, không cần biết trước). `fn_set_updated_at()`/`fn_increment_version_number()` chỉ tham chiếu tên cột (`updated_at`/`version_number`), không tham chiếu tên bảng nào. Batch 0 chạy được **trước khi bất kỳ bảng nào tồn tại** — đã verify bằng cách đọc lại toàn bộ file: không có `CREATE TABLE`, không `INSERT`, không `SELECT FROM <bảng>` nào |
| **No dependency on RLS** | ✅ Đúng — không `CREATE POLICY`, không `ENABLE/DISABLE ROW LEVEL SECURITY`, không tham chiếu `auth.uid()` ở đâu trong Batch 0 |
| **No dependency on application code** | ✅ Đúng — toàn bộ logic nằm trong PostgreSQL (`plpgsql`), không gọi Edge Function/Webhook/HTTP nào, không giả định Backend đã chạy hoặc đã insert dữ liệu nào |

**🔑 Hard Contract cần Batch 1/2/4 tuân thủ (mới phát hiện khi viết SQL thật, không có trong Design Round nào):** `fn_write_history()` giả định `history.<table>` có **đúng thứ tự cột, đúng tên cột** như `public.<table>`, cộng 1 cột `valid_from timestamptz NOT NULL` ở cuối. Đây là ràng buộc **ngầm** (implicit) bắt buộc đúng khi viết `CREATE TABLE history.learner`/`history.knowledge_node`/`history.discovery_session`/`history.mentor_session` ở các Batch sau — nếu thứ tự cột lệch, `fn_write_history()` sẽ **insert sai cột vào sai vị trí** mà không báo lỗi rõ ràng (nếu kiểu dữ liệu trùng nhau ở vị trí lệch) hoặc lỗi kiểu dữ liệu (nếu kiểu khác nhau). **Ghi nhận làm điều kiện bắt buộc cho Batch 1/2/4, không phải Risk chờ quyết định** — đây là yêu cầu kỹ thuật cứng, không có phương án thay thế nào rẻ hơn mà vẫn giữ "generic, 1 function cho cả 4 bảng" như đã chọn ở Round Planning.

---

## 5. Đối chiếu Decision/Design đã khóa

| Nguồn | Đối chiếu |
|---|---|
| [DECISION-050](../11_Decisions/DECISION-050-SQL-PreGeneration-Finalization.md) mục 1 | ✅ `fn_set_updated_at()` đúng 100% — `BEFORE UPDATE`, vô điều kiện, không so sánh `OLD`/`NEW`, không gắn `BEFORE INSERT` |
| [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md) | ✅ `fn_increment_version_number()` đúng công thức đã khóa (`NEW.version_number := OLD.version_number + 1`), `BEFORE UPDATE` |
| [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md) | ✅ `fn_write_history()` đúng cơ chế đã khóa — trigger-maintained, `AFTER UPDATE`, schema riêng `history`, cột `valid_from` |
| [SQL_GENERATION_MASTER_PLAN.md](SQL_GENERATION_MASTER_PLAN.md) mục 6 | ✅ Đúng 3 function đã liệt kê, không thêm/thiếu function nào |
| [POSTGRESQL_FEATURE_MATRIX.md](POSTGRESQL_FEATURE_MATRIX.md) mục 4 | ✅ Không tạo Index nào ở Batch 0 (đúng — Index gắn theo bảng, chưa tồn tại bảng) |

**Không phát hiện sai lệch nào với Design/Decision đã khóa.**

---

## 6. Những gì KHÔNG nằm trong Batch 0 (cố ý, không phải thiếu sót)

| Hạng mục | Vì sao không ở đây |
|---|---|
| `CREATE TRIGGER ... ON <table> EXECUTE FUNCTION fn_*()` | Cần bảng tồn tại trước — gắn ở Batch 1/2/4 (cùng batch tạo bảng tương ứng), không phải Batch 0 |
| `CREATE TABLE history.learner`/`history.knowledge_node`/`history.discovery_session`/`history.mentor_session` | Phải tạo cùng/ngay sau bảng `public.*` tương ứng (Batch 1/2/4) — Batch 0 chỉ tạo schema rỗng |
| Helper function cho CHECK "not empty" (`length(trim(x)) > 0`) | Không cần — viết inline trong từng CHECK constraint ở mỗi bảng, không trung tâm hóa (đúng quyết định "không lookup/helper layer" đã chốt) |
| `CREATE POLICY` | Batch 6, sau khi mọi bảng tồn tại |

---

## Kết luận

**Batch 0 sẵn sàng áp dụng (apply) vào môi trường Supabase development trước khi chạy Batch 1.** Không phát hiện lỗi tương thích PostgreSQL/Supabase, không phụ thuộc bảng/RLS/application code nào. 1 Hard Contract được ghi nhận tường minh (mục 4) cho Batch 1/2/4 tuân thủ khi tạo 4 bảng `history.*`.

## Liên kết ngược

[SQL_BATCH0_INFRASTRUCTURE.sql](SQL_BATCH0_INFRASTRUCTURE.sql), [SQL_GENERATION_MASTER_PLAN.md](SQL_GENERATION_MASTER_PLAN.md), [MIGRATION_DEPENDENCY_GRAPH.md](MIGRATION_DEPENDENCY_GRAPH.md), [POSTGRESQL_FEATURE_MATRIX.md](POSTGRESQL_FEATURE_MATRIX.md), [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md), [DECISION-050](../11_Decisions/DECISION-050-SQL-PreGeneration-Finalization.md).

**Next:** SQL Batch 1 — DDL Round 1 (Identity/Goal/Roadmap/Learning Session), 8 bảng + trigger attachment cho `learner`.
