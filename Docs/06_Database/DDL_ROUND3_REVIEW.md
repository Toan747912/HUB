# DDL Round 3 Review — Cross-Module Closure + Round 1/2/3 Consistency

> Đánh giá [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md) **và** rà soát nhất quán xuyên Round 1+2+3 (17 bảng tổng cộng tới giờ) trước khi cho phép sinh SQL thật.

## 1. Consistency

| Kiểm tra | Kết quả |
|---|---|
| 2 bảng Round 3 (`roadmap_node_knowledge_node`, `expansion_record`) map đúng entity đã khóa | ✅ |
| Naming khớp [DatabaseNamingConvention.md](DatabaseNamingConvention.md) | ✅ |
| ID Strategy khớp — `roadmap_node_knowledge_node` (Snapshot-like, `gen_random_uuid()`); `expansion_record` (append-only, ULID-style) | ✅ |
| `*_actor_type` CHECK dùng đúng 3 giá trị (`learner`/`backend_core`/`ai_service`) **xuyên suốt 17 bảng (Round 1+2+3)** | ✅ — đã rà soát lại toàn bộ, không có bảng nào lệch danh sách |
| `removed_at` (mục 1.1) là pattern mới — chưa từng dùng ở Round 1/2 | 🔶 **Cần đối chiếu nhất quán** — xem mục dưới |

### 1.1 Đối chiếu pattern "soft state qua timestamp" xuyên Round 1-3

Round 3 giới thiệu `removed_at` (timestamp nullable đại diện trạng thái "đã gỡ") — đây là pattern **giống** `learner.anonymized_at` (Round 1) và **khác** cách `roadmap`/`roadmap_node` xử lý thay đổi (qua `approval_record`, không có cột trạng thái riêng). Rà soát để đảm bảo không có 2 cách làm khác nhau cho cùng 1 loại tình huống:

| Tình huống | Cách xử lý đã chọn | Bảng |
|---|---|---|
| Entity có 1 trạng thái nhị phân đơn giản (active/inactive), không có "nội dung" để sửa | Cột timestamp nullable, tên `*_at` mô tả đúng hành động (`anonymized_at`, `removed_at`) | `learner`, `roadmap_node_knowledge_node` |
| Entity có cấu trúc/nội dung phức tạp cần đổi qua thời gian, cần lý do hiển thị | Companion log riêng (`approval_record`) | `roadmap`, `roadmap_node` |
| Entity là sự kiện đã xảy ra, không bao giờ đổi | Append-only, không cột trạng thái | `goal`, `evidence`, `assessment_result`, `knowledge_edge`, `expansion_record` |

**Kết luận: nhất quán.** `roadmap_node_knowledge_node` đúng nhóm 1 (quan hệ tồn tại/không tồn tại, không có nội dung phụ để sửa) — không cần `approval_record` riêng (dependency chỉ "thêm" hoặc "gỡ", không có "sửa nội dung dependency" nào khác để cần lý do chi tiết kiểu Roadmap structure).

**Không phát hiện mâu thuẫn nội bộ xuyên Round 1-3.**

## 2. Domain Alignment

| Kiểm tra | Kết quả |
|---|---|
| Cardinality khớp [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 2 | ✅ (mục 3 [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md)) |
| Ownership: `roadmap_node_knowledge_node` = Goal & Roadmap Domain (viết), Knowledge Graph Domain (chỉ đọc); `expansion_record` = Knowledge Graph Domain | ✅ Khớp [DECISION-015](../11_Decisions/DECISION-015-Knowledge-Engine.md) | 
| Aggregate Boundary — không mở Boundary mới, đúng phần mở rộng của Boundary 3 (tham chiếu) và Boundary 4 (con thật) | ✅ |
| **`ExpansionRecord — KnowledgeEdge` cardinality chưa chốt** | 🔶 Đã ghi nhận rõ là gap Domain Architecture cần Founder/ChatGPT xác nhận (Risk #1, [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md)) — không tự quyết định |

## 3. Learning Philosophy Alignment

| Nguyên tắc | Đối chiếu | Đạt? |
|---|---|---|
| **Mọi kiến thức phải gắn với dự án** | Đây chính là nguyên tắc mà `roadmap_node_knowledge_node` **thực thi trực tiếp lần đầu tiên** ở tầng dữ liệu (Round 2 review đã ghi nhận nguyên tắc này "chỉ thực thi gián tiếp qua Round 1", chưa có bảng nối thật) — giờ có FK thật nối `RoadmapNode` (dự án/mục tiêu cụ thể) tới `KnowledgeNode` (tri thức chuẩn hóa), nguyên tắc này **lần đầu được đảm bảo ở tầng database**, không chỉ ở tầng quy ước Application | ✅ — **cải thiện trực tiếp so với Round 2** |
| **AI phải giải thích được lý do đánh giá** (mở rộng: lý do mở rộng tri thức) | `expansion_record.expansion_reason` bắt buộc `NOT NULL` + `CHECK` không rỗng, đúng tinh thần `assessment_result.reasoning` ở Round 2 — áp dụng nhất quán cho cả quyết định Expansion, không chỉ quyết định Assessment | ✅ |
| **AI phải thích nghi với từng learner** | Không áp dụng trực tiếp ở Round 3 — cả 2 bảng đều là dữ liệu cấu trúc/sự kiện dùng chung (`roadmap_node_knowledge_node` thuộc 1 Roadmap của 1 Learner cụ thể qua Round 1, nhưng bản thân Dependency Edge không "thích nghi" — nó là cấu trúc, không phải cá nhân hóa) | ✅ (không vi phạm, chỉ không áp dụng) |
| **Không học vẹt / Hiểu quan trọng hơn hoàn thành** | Không áp dụng trực tiếp — 2 bảng Round 3 là dữ liệu cấu trúc, không phải dữ liệu đánh giá | ✅ (không áp dụng) |

**Không phát hiện vi phạm. 1 điểm cải thiện rõ rệt:** nguyên tắc "Mọi kiến thức phải gắn với dự án" chuyển từ "chỉ đúng về thiết kế, chưa có bảng thật" (Round 2) sang "có FK thật thực thi" (Round 3).

## 4. Supabase Alignment

| Kiểm tra | Kết quả |
|---|---|
| `uuid`, `snake_case`, audit columns nhất quán | ✅ |
| Partial unique index (`WHERE removed_at IS NULL`) | ✅ Tính năng PostgreSQL chuẩn, Supabase hỗ trợ đầy đủ — không có rủi ro tương thích |
| RLS — `roadmap_node_knowledge_node` cần 3-hop JOIN | 🔶 Ghi nhận (Risk #3, [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md)) — không chặn `CREATE TABLE` |
| RLS — `expansion_record` cùng pattern shared/global như Round 2 | ✅ Nhất quán, không cần thiết kế pattern mới |

## 5. Constraint Completeness

| Loại constraint | Bao phủ |
|---|---|
| Primary Key | 2/2 bảng |
| Foreign Key | Đủ — cả 2 FK tới `knowledge_node` đều `RESTRICT`, nhất quán Round 2 |
| Unique | 1 partial unique (`roadmap_node_knowledge_node`) — không phải "đề xuất chưa khóa" như nhiều Unique ở Round 1/2, mà là **cần thiết để đúng ngữ nghĩa** ("không có 2 dependency active trùng lặp") — mức độ chắc chắn cao hơn các đề xuất Unique trước đó |
| Check | Đủ — `expansion_class` đánh dấu rõ "đề xuất", `expansion_reason` có CHECK not-empty đúng tinh thần Explainability |
| NOT NULL | Đúng phân loại append-only vs "trạng thái nhị phân" |

**Constraint Completeness: đầy đủ cho phạm vi Round 3.**

## 6. Kết luận sơ bộ

Xem [ROUND3_ARCHITECTURE_REVIEW.md](ROUND3_ARCHITECTURE_REVIEW.md) cho validation toàn diện "Round 1+2+3 có hỗ trợ được AI Teaching/Assessment/Recommendation/Explainability không" — kết luận `READY_FOR_SQL_GENERATION`/`NEEDS_REVISION` cuối cùng tổng hợp ở tài liệu đó.

## Liên kết ngược

[DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md), [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md), [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md), [ROUND2_ARCHITECTURE_REVIEW.md](ROUND2_ARCHITECTURE_REVIEW.md), [ROUND3_ARCHITECTURE_REVIEW.md](ROUND3_ARCHITECTURE_REVIEW.md).
