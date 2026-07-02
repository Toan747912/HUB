# SQL Batch 1 Review — Identity + Goal + Roadmap

> Review của [SQL_BATCH1_IDENTITY_GOAL_ROADMAP.sql](SQL_BATCH1_IDENTITY_GOAL_ROADMAP.sql). Đối chiếu [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md) mục 1.1-1.5, [SQL_GENERATION_MASTER_PLAN.md](SQL_GENERATION_MASTER_PLAN.md), [MIGRATION_DEPENDENCY_GRAPH.md](MIGRATION_DEPENDENCY_GRAPH.md), [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md), [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md), [DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md), [DECISION-050](../11_Decisions/DECISION-050-SQL-PreGeneration-Finalization.md).

## 0. Phạm vi — đính chính so với DDL Round 1 đầy đủ

Batch này chỉ sinh **6/8 bảng** của DDL Round 1: `learner`, `goal`, `roadmap`, `roadmap_node`, `approval_record`, `history.learner`. **Learning Session Module** (`learning_session`, `sub_session`, `learning_session_transition`, [DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md)) **không nằm trong danh sách bảng được giao cho batch này** — đây là quyết định phạm vi của chính batch (đặt tên "IDENTITY + GOAL + ROADMAP"), không phải thiếu sót. 2 bảng cần `roadmap_node`/`learning_session` chưa tồn tại (`sub_session.roadmap_node_id`, `approval_record` đã đủ trong batch này) không bị ảnh hưởng — `roadmap_node` đã có trong batch này.

---

## 1. FK Dependency Order — xác nhận

Thứ tự trong file SQL: `learner` → `history.learner` → `goal` → `roadmap` → `roadmap_node` → `approval_record`.

| Bảng | Phụ thuộc | Đã tồn tại trước khi `CREATE TABLE` chạy? |
|---|---|---|
| `learner` | `auth.users` (Supabase, có sẵn) | ✅ |
| `history.learner` | (không FK) | ✅ — chỉ cần schema `history` (Batch 0) |
| `goal` | `learner` (×2: `learner_id`, self `supersedes_goal_id`) | ✅ |
| `roadmap` | `goal` | ✅ |
| `roadmap_node` | `roadmap`, self (`parent_roadmap_node_id`) | ✅ |
| `approval_record` | `roadmap`, `roadmap_node`, `learner` | ✅ |

**Khớp 100% thứ tự đã hoạch định ở [MIGRATION_DEPENDENCY_GRAPH.md](MIGRATION_DEPENDENCY_GRAPH.md) mục 3 (Batch 1, bước 1-5).** Không có FK nào trỏ tới bảng chưa tồn tại tại thời điểm `CREATE TABLE` của nó chạy.

---

## 2. DECISION-043 — `learner.id = auth.users.id`

✅ Đúng — `learner.id uuid NOT NULL` **không có `DEFAULT`** (không tự sinh UUID), `CONSTRAINT fk_learner_id_auth_users FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE RESTRICT`. Đây là PK duy nhất trong toàn schema không tự sinh giá trị ở DB — đúng ngoại lệ đã khóa ([DatabaseNamingConvention.md](DatabaseNamingConvention.md) mục 3). `ON DELETE RESTRICT` bảo vệ DECISION-037 (Backend phải Anonymize trước khi cho phép xóa `auth.users`, không dựa cascade tự động).

---

## 3. DECISION-044 — `version_number` strategy

✅ Đúng — `learner.version_number bigint NOT NULL DEFAULT 1` + `trg_learner_increment_version_number BEFORE UPDATE EXECUTE FUNCTION fn_increment_version_number()`. Đây là bảng thứ 2 (sau `knowledge_node_mastery`, sẽ sinh ở Batch 2) áp dụng cơ chế này — đúng quyết định DECISION-050 mục 1 ("khuyến nghị áp dụng cho `learner`" dù DECISION-044 gốc để tùy chọn). Không bảng nào khác trong Batch 1 có `version_number` (đúng — `goal`/`approval_record` append-only; `roadmap`/`roadmap_node` bảo vệ qua `approval_record`, không qua versioning).

---

## 4. DECISION-045 — History Table strategy

✅ Đúng — `history.learner` tạo ngay sau `learner`, **đúng Hard Contract** đã ghi nhận ở [SQL_BATCH0_REVIEW.md](SQL_BATCH0_REVIEW.md) mục 4: 9 cột mirror `public.learner` theo đúng thứ tự, cộng `valid_from timestamptz NOT NULL` ở cuối — đã verify thủ công: `id, anonymized_at, version_number, created_at, created_by_actor_type, created_by_actor_id, updated_at, updated_by_actor_type, updated_by_actor_id` (9 cột, đúng thứ tự `CREATE TABLE public.learner`) + `valid_from` (cột thứ 10). `trg_learner_write_history AFTER UPDATE` gắn đúng. `roadmap`/`roadmap_node` **không** có History Table — đúng, bảo vệ qua `approval_record` (companion log).

### 🔑 Risk mới phát hiện khi viết SQL thật — `now()` bị "đóng băng" trong 1 transaction

PostgreSQL `now()` (tương đương `transaction_timestamp()`) trả về **cùng 1 giá trị cho toàn bộ 1 transaction**, không phải thời điểm thực thi câu lệnh. Nếu Application Layer thực hiện **2 lần `UPDATE public.learner`** (cùng `id`) trong **cùng 1 transaction**, cả 2 lần `trg_learner_write_history` sẽ ghi `valid_from` **giống nhau tuyệt đối** vào `history.learner`. Đây là lý do `history.learner` (mục 2, file SQL) **không có PRIMARY KEY/UNIQUE** trên `(id, valid_from)` — nếu có, lần `UPDATE` thứ 2 trong cùng transaction sẽ làm `INSERT` vào `history.learner` **thất bại** (vi phạm unique), khiến cả transaction rollback dù bản thân ý định `UPDATE learner` 2 lần là hợp lệ.

**Mức độ:** Medium — không chặn Batch 1 (đã thiết kế né được bằng cách không đặt PK/UNIQUE), nhưng cần ghi nhận cho Backend: `history.learner` **có thể có nhiều row trùng `valid_from`** nếu Application Layer update nhiều lần trong 1 transaction — khi đọc lịch sử, **không thể dùng `valid_from` để sắp thứ tự tuyệt đối các lần update trong cùng 1 transaction** (chỉ phân biệt được giữa các transaction khác nhau). **Khuyến nghị cho Batch 0 ở 1 lần sửa sau** (ngoài phạm vi Batch 1 — không tự sửa `fn_write_history()` ở đây): đổi `now()` thành `clock_timestamp()` trong `fn_write_history()` nếu cần phân giải chính xác tới mức sub-transaction — **ghi nhận làm Open Item, không tự sửa Batch 0 trong Batch 1**.

---

## 5. DECISION-050 — `updated_at` trigger strategy

✅ Đúng — `trg_learner_set_updated_at`, `trg_roadmap_set_updated_at`, `trg_roadmap_node_set_updated_at`, cả 3 `BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()` — không điều kiện, đúng cơ chế đã khóa. `goal`/`approval_record` **không** có trigger này (đúng — append-only, không có cột `updated_at`). Không bảng nào trong Batch 1 tự set `updated_at` qua `DEFAULT` khi `UPDATE` (chỉ `DEFAULT now()` áp dụng lúc `INSERT`, đúng như thiết kế).

---

## 6. Supabase Compatibility

| Điểm | Đánh giá |
|---|---|
| `auth.users` reference | Schema `auth` luôn tồn tại sẵn trên mọi Supabase project — `FOREIGN KEY ... REFERENCES auth.users(id)` là pattern chuẩn Supabase (giống `public.profiles` phổ biến) |
| `gen_random_uuid()` | Built-in PG13+, không cần extension bổ sung ngoài `pgcrypto` đã enable ở Batch 0 |
| Trigger function namespace `public.fn_*` | Đúng schema `public` — PostgREST/Supabase Client không bị ảnh hưởng (function không lộ qua REST API trừ khi gọi RPC tường minh, không xảy ra ở đây) |
| Không `CREATE POLICY`/`ENABLE ROW LEVEL SECURITY` nào | ✅ Đúng phạm vi — RLS là Batch 6 |
| Index trên FK | Đã thêm đầy đủ cho mọi FK chưa tự có index từ UNIQUE/PK (`ix_goal_learner_id`, `ix_goal_supersedes_goal_id`, `ix_roadmap_node_roadmap_id`, `ix_roadmap_node_parent_roadmap_node_id`, `ix_approval_record_roadmap_id`, `ix_approval_record_roadmap_node_id`, `ix_approval_record_approved_by_learner_id`) — đúng nguyên tắc đã ghi ở [POSTGRESQL_FEATURE_MATRIX.md](POSTGRESQL_FEATURE_MATRIX.md) mục 4 ("PostgreSQL không tự tạo index cho FK") |

**Không phát hiện vấn đề tương thích Supabase nào.**

---

## 7. Partial Indexes — không áp dụng cho Batch 1

3 Partial Index đã được ACCEPT ở [DECISION-050](../11_Decisions/DECISION-050-SQL-PreGeneration-Finalization.md) mục 6 (`ix_learning_session_learner_id_active`, `ix_sub_session_learning_session_id_active`, `ix_mentor_session_learner_id_active`) **đều nhắm tới bảng ngoài phạm vi Batch 1** (`learning_session`, `sub_session`, `mentor_session`) — **không có partial index nào được sinh ở batch này**, đúng, không phải thiếu sót. Sẽ sinh ở batch chứa Learning Session Module và batch chứa `mentor_session` (Round 4).

---

## 8. Open Item kế thừa từ Design — chưa được Decision Log khóa cứng

| Constraint | Trạng thái |
|---|---|
| `uq_roadmap_node_roadmap_id_parent_roadmap_node_id_sort_order` | **Đã sinh trong SQL** đúng như đề xuất ở [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md) mục 1.4 (Risk #7) — DECISION-050 không xét lại open item này (ngoài phạm vi 6 mục được giao). Sinh ra **đúng theo Design đã có**, không tự bỏ — nhưng đây **chưa phải Decision Log đã khóa**, nếu Founder muốn cho phép 2 node anh em cùng `sort_order` (học song song), cần 1 migration `ALTER TABLE ... DROP CONSTRAINT` ở Round sau, không phải sửa lại Batch 1 ngay |

---

## Kết luận

**Batch 1 sẵn sàng áp dụng sau Batch 0.** Toàn bộ 5 mục Validation (FK order, DECISION-043/044/045/050) khớp đúng thiết kế đã khóa. 1 Risk mới phát hiện (`now()` đóng băng trong transaction, mục 4) — không chặn batch này, ghi nhận cho Backend + đề xuất sửa `fn_write_history()` ở 1 Batch sau. 1 Open Item kế thừa (`uq_roadmap_node_*`) được sinh đúng theo Design, chưa phải quyết định cuối cùng.

## Liên kết ngược

[SQL_BATCH1_IDENTITY_GOAL_ROADMAP.sql](SQL_BATCH1_IDENTITY_GOAL_ROADMAP.sql), [SQL_BATCH0_INFRASTRUCTURE.sql](SQL_BATCH0_INFRASTRUCTURE.sql), [SQL_BATCH0_REVIEW.md](SQL_BATCH0_REVIEW.md), [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md), [MIGRATION_DEPENDENCY_GRAPH.md](MIGRATION_DEPENDENCY_GRAPH.md), [POSTGRESQL_FEATURE_MATRIX.md](POSTGRESQL_FEATURE_MATRIX.md), [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md), [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md), [DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md), [DECISION-050](../11_Decisions/DECISION-050-SQL-PreGeneration-Finalization.md).

**Next:** Learning Session Module batch (`learning_session`, `sub_session`, `learning_session_transition`) để hoàn tất DDL Round 1, sau đó Batch 2 (DDL Round 2).
