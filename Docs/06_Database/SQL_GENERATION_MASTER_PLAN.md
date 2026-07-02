# SQL Generation Master Plan — AI Mentor OS

> Database Design Phase — **Step 4C, Pre-SQL Planning Round**. Tổng hợp toàn bộ [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md)–[DDL_ROUND5_DESIGN.md](DDL_ROUND5_DESIGN.md) thành kế hoạch sinh SQL cụ thể cho **PostgreSQL/Supabase**. Đây là tài liệu **lập kế hoạch** — không có `CREATE TABLE`, không migration, không SQL thực tế nào trong tài liệu này. Đồng hành: [MIGRATION_DEPENDENCY_GRAPH.md](MIGRATION_DEPENDENCY_GRAPH.md) (thứ tự dependency chi tiết), [POSTGRESQL_FEATURE_MATRIX.md](POSTGRESQL_FEATURE_MATRIX.md) (ENUM/Index/Constraint chi tiết).

## 1. Enumerate toàn bộ Entity cần sinh SQL

**28 bảng**, xuyên 5 DDL Round, không bảng nào trùng lặp, không bảng nào còn thiếu so với [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md)–[DDL_ROUND5_DESIGN.md](DDL_ROUND5_DESIGN.md):

| Round | # bảng | Tên bảng |
|---|---|---|
| 1 | 8 | `learner`, `goal`, `roadmap`, `roadmap_node`, `approval_record`, `learning_session`, `sub_session`, `learning_session_transition` |
| 2 | 7 | `knowledge_node`, `knowledge_edge`, `evidence`, `evidence_link`, `assessment_result`, `knowledge_node_mastery`, `trace_link` |
| 3 | 2 | `roadmap_node_knowledge_node`, `expansion_record` |
| 4 | 5 | `discovery_session`, `self_assessment_mismatch`, `mentor_session`, `recommendation_proposal`, `recommendation_proposal_response` |
| 5 | 6 | `decision_header`, `teaching_decision_detail`, `local_expansion_decision_detail`, `roadmap_mapping_decision_detail`, `stuck_detection_decision_detail`, `intervention_decision_detail` |

**Không có bảng "wrapper"/lookup table nào ngoài 28 bảng này** — mọi enum-like value dùng CHECK constraint inline, không bảng lookup riêng (xem mục 5).

---

## 2. Migration Batches

**Quyết định đóng gói:** mỗi Migration Batch **mirror đúng 1 DDL Round** (5 batch chính) + **đóng forward-dependency ngay cuối batch nơi bảng đích lần đầu tồn tại** (không tạo batch "closure" riêng — đúng cách [DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md) mục 1.6 và [DDL_ROUND5_DESIGN.md](DDL_ROUND5_DESIGN.md) mục 1.7/1.8 đã làm) + 1 Batch 0 (hạ tầng chung) + 1 Batch 6 (RLS, sau khi mọi bảng đã tồn tại).

**🔶 Lưu ý kiến trúc quan trọng:** vì toàn bộ schema đã được biết trước (không phải sinh SQL tăng dần theo từng Round như khi đang Design), **không có chu trình phụ thuộc thật (true cycle)** nào trong 28 bảng — mọi "forward dependency"/"cột giữ chỗ chưa có FK" ở Round 1-4 là **tạo tác của quy trình Design tuần tự theo Round**, không phải giới hạn kỹ thuật. Một lựa chọn thay thế hợp lệ là gộp toàn bộ 28 `CREATE TABLE` vào 1 batch duy nhất theo đúng thứ tự topological (không cần `ALTER TABLE ADD CONSTRAINT` nào). **Quyết định của Master Plan này: giữ 5 batch theo Round** — vì (a) khớp 1-1 với lịch sử Design đã có, dễ audit "bảng này thuộc Round nào", (b) cho phép rollback theo từng Round nếu phát hiện lỗi sau khi áp dụng 1 batch, (c) chi phí thêm vài câu `ALTER TABLE ADD CONSTRAINT` ở cuối mỗi batch là không đáng kể. Đây là lựa chọn đóng gói, không phải thay đổi cấu trúc bảng nào đã khóa.

| Batch | Nội dung | Phụ thuộc Batch trước |
|---|---|---|
| **0** | Hạ tầng chung: extension (`pgcrypto`/`pgcrypto` cho `gen_random_uuid()`), schema `history`, 3 trigger function chung (`fn_set_updated_at`, `fn_increment_version_number`, `fn_write_history`) | — |
| **1** | 8 bảng Round 1 (Identity/Goal/Roadmap/Learning Session) — xem thứ tự nội bộ ở [MIGRATION_DEPENDENCY_GRAPH.md](MIGRATION_DEPENDENCY_GRAPH.md) mục 1 | Batch 0 (cần `auth.users` từ Supabase Auth, có sẵn) |
| **2** | 7 bảng Round 2 (Knowledge/Evidence/Assessment/Traceability) + **closure**: `ALTER TABLE sub_session ADD CONSTRAINT ... FOREIGN KEY (knowledge_node_id) REFERENCES knowledge_node` | Batch 1 |
| **3** | 2 bảng Round 3 (Roadmap↔Knowledge, Expansion) | Batch 2 |
| **4** | 5 bảng Round 4 (Discovery/Mentor Interaction/Recommendation) + **closure**: `ALTER TABLE evidence ADD CONSTRAINT ... FOREIGN KEY (mentor_session_id) REFERENCES mentor_session` | Batch 3 |
| **5** | 6 bảng Round 5 (Decision Persistence) + **closure**: `ALTER TABLE` thêm `decision_header_id` lên `assessment_result`/`recommendation_proposal`/`expansion_record`/`self_assessment_mismatch`; mở rộng `ck_trace_link_source_type` (3 giá trị mới) | Batch 4 |
| **6** | RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` cho 28 bảng, theo 5 nhóm RLS (mục 10, [POSTGRESQL_FEATURE_MATRIX.md](POSTGRESQL_FEATURE_MATRIX.md)) | Batch 5 (cần mọi bảng + FK tồn tại trước khi viết Policy tham chiếu chúng) |

**Trigger đính kèm bảng nào, tạo cùng batch với bảng đó** (không dồn vào 1 batch trigger riêng) — xem mục 6.

---

## 3. Dependency Order (tóm tắt — chi tiết đầy đủ ở [MIGRATION_DEPENDENCY_GRAPH.md](MIGRATION_DEPENDENCY_GRAPH.md))

Thứ tự topological trong mỗi Batch (chỉ liệt kê điểm cần chú ý — không lặp lại toàn bộ graph):

- **Batch 1:** `learner` → `goal` → `roadmap` → `roadmap_node` → `approval_record` → `learning_session` → `sub_session` → `learning_session_transition`.
- **Batch 2:** `knowledge_node` → `knowledge_edge` → `evidence` → `evidence_link` → `assessment_result` → `knowledge_node_mastery` (**phải sau** `assessment_result` — FK `last_assessment_result_id NOT NULL`) → `trace_link` (không phụ thuộc bảng nào, đặt cuối theo quy ước "hạ tầng cross-cutting sau cùng").
- **Batch 3:** `roadmap_node_knowledge_node` → `expansion_record` (độc lập nhau, thứ tự không quan trọng).
- **Batch 4:** `discovery_session` → `self_assessment_mismatch` (cần `discovery_session`+`assessment_result` đã có từ Batch 2) → `mentor_session` (cần `sub_session` từ Batch 1) → `recommendation_proposal` → `recommendation_proposal_response`.
- **Batch 5:** `decision_header` → `teaching_decision_detail` (cần `mentor_session`+`knowledge_node`) → `local_expansion_decision_detail` → `roadmap_mapping_decision_detail` (cần `roadmap_node_knowledge_node` từ Batch 3) → `stuck_detection_decision_detail` (cần `sub_session` từ Batch 1) → `intervention_decision_detail` (cần `stuck_detection_decision_detail` cùng batch).

**Không có dependency ngược Batch nào** (vd Batch 2 cần bảng ở Batch 4) — thứ tự 0→6 là tuyến tính, không cần xử lý đặc biệt.

---

## 4. PostgreSQL ENUM Requirements

**Quyết định: KHÔNG dùng PostgreSQL native `ENUM` type (`CREATE TYPE ... AS ENUM`) cho bất kỳ cột nào.** Toàn bộ "enum-like" value (10+ cột xuyên 28 bảng: `decision_type`, `intervention_tier`, `action_type`, `node_status`, `state`×6 bảng, `stance`, `source_type`/`target_type`, `actor_type`×mọi bảng...) dùng **CHECK constraint** với danh sách giá trị `text`, nhất quán 100% với cách Round 1-5 đã thiết kế. Lý do (đã xác nhận từ [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md) mục so sánh): native `ENUM` là "cơ hội nâng cấp tùy chọn", không bắt buộc — và có nhược điểm vận hành thật (đổi giá trị enum native yêu cầu `ALTER TYPE ... ADD VALUE` ngoài transaction ở PG cũ hơn, phức tạp hơn `ALTER TABLE ... DROP/ADD CONSTRAINT` của CHECK). **Không tạo `CREATE TYPE` nào ở Round SQL Generation.** Danh sách đầy đủ mọi CHECK enum — xem [POSTGRESQL_FEATURE_MATRIX.md](POSTGRESQL_FEATURE_MATRIX.md) mục 1.

---

## 5. Shared Lookup Strategy

**Quyết định: KHÔNG tạo bảng lookup chung nào** (kiểu `lookup_value(category, code, label)`). Lý do: mọi danh sách giá trị đóng (enum-like) trong 28 bảng đều **nhỏ, cố định theo Decision Log, không cần Admin sửa runtime** — không có yêu cầu nào trong Decision Log (DECISION-001..049) đòi hỏi giá trị enum phải sửa được qua UI Admin mà không cần deploy. CHECK constraint + hằng số tương ứng ở Application Layer (TypeScript enum/const) là đủ — đồng bộ giữa 2 nơi là rủi ro vận hành đã biết (giống mọi cặp CHECK/Application Layer khác), không phải lý do để thêm 1 lớp lookup table.

**Ngoại lệ duy nhất cần theo dõi:** nếu Open Question #3 (phạm vi `domain_category` của `knowledge_node` — 6 domain: programming/ai/design/language/marketing/business) được xác nhận **mở rộng được bởi Admin** (không chỉ Founder sửa code), đây sẽ là lý do hợp lệ đầu tiên để thêm 1 bảng lookup — **chưa xảy ra ở Round nào tới giờ**, không tự thêm trước.

---

## 6. Trigger Requirements

| Trigger Function (tạo 1 lần, Batch 0) | Gắn vào bảng nào | Thời điểm | Batch gắn |
|---|---|---|---|
| `fn_set_updated_at()` — set `NEW.updated_at = now()` | Mọi bảng "Current State Snapshot" có `updated_at`: `learner`, `roadmap`, `roadmap_node`, `learning_session`, `sub_session`, `knowledge_node`, `knowledge_node_mastery`, `discovery_session`, `mentor_session` (9 bảng) | `BEFORE UPDATE` | Cùng batch tạo bảng đó (1, 2, hoặc 4) |
| `fn_increment_version_number()` — `NEW.version_number := OLD.version_number + 1` | `knowledge_node_mastery` (bắt buộc, DECISION-044), `learner` (khuyến nghị áp dụng — cột đã thiết kế sẵn `version_number`, để trigger thiếu sẽ làm cột vô nghĩa) | `BEFORE UPDATE` | Batch 2 (`knowledge_node_mastery`), Batch 1 (`learner`) |
| `fn_write_history(history_schema_table)` — ghi row cũ (`OLD.*`) vào `history.<table>` trước khi update | `learner` (Batch 1), `knowledge_node` (Batch 2), `discovery_session` (Batch 4), `mentor_session` (Batch 4) — đúng 4 bảng theo DECISION-045 | `AFTER UPDATE` | Cùng batch tạo bảng đó |

**🔶 Phát hiện mới ở Round Planning này:** `fn_set_updated_at()` **chưa từng được thiết kế tường minh** ở bất kỳ DDL Round 1-5 nào — mọi Round chỉ liệt kê cột `updated_at` trong Audit Strategy, không chỉ rõ ai/cái gì duy trì giá trị này chính xác (Application Layer set thủ công, hay trigger). Không có trigger này, `updated_at` sẽ **sai** bất cứ khi nào Application Layer quên set thủ công. **Quyết định Master Plan: dùng trigger** (an toàn hơn, nhất quán hơn dựa vào discipline Application Layer) — đây là 1 quyết định triển khai (implementation detail) mới ở Round Planning, không phải sửa lại thiết kế cột đã khóa ở Round 1-5 (không đổi tên/kiểu cột nào).

**Không cần trigger nào khác** — không bảng nào yêu cầu trigger nghiệp vụ phức tạp (denormalization tự động, cascade tùy biến...) theo Decision Log hiện tại.

---

## 7. History Table Requirements (DECISION-045)

| Bảng chính | Bảng lịch sử | Trigger |
|---|---|---|
| `learner` | `history.learner` | `fn_write_history`, `AFTER UPDATE` |
| `knowledge_node` | `history.knowledge_node` | `fn_write_history`, `AFTER UPDATE` |
| `discovery_session` | `history.discovery_session` | `fn_write_history`, `AFTER UPDATE` |
| `mentor_session` | `history.mentor_session` | `fn_write_history`, `AFTER UPDATE` |

**Đúng 4/28 bảng** — không đổi từ [DatabaseNamingConvention.md](DatabaseNamingConvention.md) mục 9 xuyên Round 1-5. Cấu trúc `history.<table>` = mọi cột của bảng chính + `valid_from timestamptz NOT NULL` (thời điểm row cũ bị thay) — schema riêng `history`, không expose qua PostgREST mặc định (đúng mong muốn, [DDL_ROUND4_ARCHITECTURE_REVIEW.md](DDL_ROUND4_ARCHITECTURE_REVIEW.md) mục 7).

---

## 8. Versioning Requirements (DECISION-044)

| Bảng | `version_number`? | Bắt buộc/Khuyến nghị |
|---|---|---|
| `knowledge_node_mastery` | ✅ Có | **Bắt buộc** — rủi ro ghi đồng thời cao nhất đã xác định |
| `learner` | ✅ Có (cột đã thiết kế từ Round 1) | Khuyến nghị áp dụng trigger (mục 6) — DECISION-044 để "tùy chọn", Master Plan chọn áp dụng cho nhất quán |
| 26 bảng còn lại | ❌ Không | Append-only (không rủi ro ghi đồng thời) hoặc Snapshot không có rủi ro ghi đồng thời cao được xác định (`roadmap`, `roadmap_node`, `learning_session`, `sub_session`, `knowledge_node`, `discovery_session`, `mentor_session` — bảo vệ qua companion log thay vì version) |

---

## 9. Audit Requirements

| Nhóm | Cột bắt buộc | Số bảng |
|---|---|---|
| **Append-only (immutable)** | `created_at`, `created_by_actor_type`, `created_by_actor_id` | 19 bảng: `goal`, `approval_record`, `learning_session_transition`, `knowledge_edge`, `evidence`, `evidence_link`, `assessment_result`, `trace_link`, `roadmap_node_knowledge_node`, `expansion_record`, `self_assessment_mismatch`, `recommendation_proposal`, `recommendation_proposal_response`, `decision_header`, `teaching_decision_detail`, `local_expansion_decision_detail`, `roadmap_mapping_decision_detail`, `stuck_detection_decision_detail`, `intervention_decision_detail` |
| **Current State Snapshot (mutable)** | + `updated_at`, `updated_by_actor_type`, `updated_by_actor_id` | 9 bảng: `learner`, `roadmap`, `roadmap_node`, `learning_session`, `sub_session`, `knowledge_node`, `knowledge_node_mastery`, `discovery_session`, `mentor_session` |

**19 + 9 = 28** — khớp tổng số bảng, không bảng nào thiếu phân loại Audit.

---

## 10. RLS Policy Groups (tóm tắt — chi tiết đầy đủ [POSTGRESQL_FEATURE_MATRIX.md](POSTGRESQL_FEATURE_MATRIX.md) mục 6)

| Nhóm | Pattern | Số bảng |
|---|---|---|
| 1 — Learner-owned, 0-hop | `learner_id = auth.uid()` (hoặc `id = auth.uid()` cho `learner`) | 10 |
| 2 — Learner-owned, 1-hop | qua FK cha trực tiếp | 11 |
| 3 — Learner-owned, 2-hop | qua 2 FK | 2 (`roadmap_node`, `approval_record`) |
| 4 — Learner-owned, 3-hop | qua 3 FK | 1 (`roadmap_node_knowledge_node`) |
| 5 — Shared/Global (không `learner_id`) | đọc công khai `authenticated`, ghi qua service role | 4 (`knowledge_node`, `knowledge_edge`, `expansion_record`, `trace_link`) |

**10+11+2+1+4 = 28** — khớp tổng số bảng.

---

## 11. Final Migration Order

```
Batch 0  — Extensions + schema `history` + trigger functions
Batch 1  — Round 1 (8 bảng, thứ tự nội bộ mục 3)
Batch 2  — Round 2 (7 bảng) + closure: sub_session.knowledge_node_id FK
Batch 3  — Round 3 (2 bảng)
Batch 4  — Round 4 (5 bảng) + closure: evidence.mentor_session_id FK
Batch 5  — Round 5 (6 bảng) + closure: 4× decision_header_id patch + trace_link enum mở rộng
Batch 6  — RLS: ENABLE RLS + CREATE POLICY, toàn bộ 28 bảng theo 5 nhóm (mục 10)
```

**Tổng: 7 migration file/batch** (đánh số `0001_extensions.sql` .. `0006_rls_policies.sql`, ví dụ đặt tên — không phải SQL thật). Mỗi Batch là 1 transaction duy nhất (Postgres DDL transactional — an toàn rollback nếu lỗi giữa batch, trừ vài lệnh không transactional như `CREATE INDEX CONCURRENTLY` nếu dùng — Round SQL Generation cần quyết định có dùng `CONCURRENTLY` hay không, ghi nhận như Open Item).

---

## 12. Open Items trước khi sinh SQL thật

| # | Item | Nguồn |
|---|---|---|
| 1 | Xác nhận đóng gói 5 batch theo Round (đã chọn) vs 1 batch flat — mục 2 | Master Plan, quyết định đóng gói |
| 2 | `fn_set_updated_at()` — trigger mới, chưa từng có trong Decision Log nào, cần Founder xác nhận chấp nhận được | Mục 6 |
| 3 | `version_number` trigger cho `learner` — DECISION-044 để "tùy chọn", Master Plan chọn áp dụng | Mục 8 |
| 4 | Mọi Risk/🔶 chưa khóa từ DDL Round 1-5 (enum đề xuất, UNIQUE đề xuất, `intervention_tier`, `signal_payload` cấu trúc...) — **không lặp lại ở đây**, xem từng [DDL_ROUNDx_GAP_ANALYSIS.md](DDL_ROUND5_GAP_ANALYSIS.md) | Kế thừa |
| 5 | `CONCURRENTLY` cho index — quyết định ở Round sinh SQL thật, không quyết định ở Planning | Mục 11 |

## Liên kết ngược

[DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md)–[DDL_ROUND5_DESIGN.md](DDL_ROUND5_DESIGN.md), [MIGRATION_DEPENDENCY_GRAPH.md](MIGRATION_DEPENDENCY_GRAPH.md), [POSTGRESQL_FEATURE_MATRIX.md](POSTGRESQL_FEATURE_MATRIX.md), [DatabaseNamingConvention.md](DatabaseNamingConvention.md), [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md), [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md), [DECISION-049](../11_Decisions/DECISION-049-Decision-Persistence-Mechanism.md).

**Chưa có SQL/`CREATE TABLE`/Migration nào được tạo. Đây là kế hoạch — Round sinh SQL thật là bước kế tiếp.**
