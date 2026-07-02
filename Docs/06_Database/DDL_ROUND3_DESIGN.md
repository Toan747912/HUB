# DDL Round 3 Design — Cross-Module Closure (Dependency Edge + Expansion Record)

> Database Design Phase — **Step 4B, Round 3**. Đóng 2 gap đã hoãn có chủ đích từ Round 1/2 ([DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md) mục 5 Risk #4; [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md) mục 5 Risk #3; [ROUND2_ARCHITECTURE_REVIEW.md](ROUND2_ARCHITECTURE_REVIEW.md) mục 3). Áp dụng [DatabaseNamingConvention.md](DatabaseNamingConvention.md), DECISION-042..047.
>
> **Thiết kế DDL ở mức mô tả — KHÔNG SQL, không API, không Frontend.**

## 0. Phạm vi

| # | Bảng | Lý do tồn tại | Đã hứa ở |
|---|---|---|---|
| 1 | `roadmap_node_knowledge_node` | Dependency Edge (M:N) — RoadmapNode phụ thuộc KnowledgeNode nào | [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md) mục 1.4 |
| 2 | `expansion_record` | Audit bắt buộc cho Knowledge Node Expansion loại Deep/Structural ([DECISION-023](../11_Decisions/DECISION-023-Controlled-Knowledge-Expansion.md)) | [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md) Risk #3 |

Cả 2 đều là entity **đã khóa** ở [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 1 (Dependency Edge ngụ ý trong quan hệ `RoadmapNode — KnowledgeNode`; `ExpansionRecord` liệt kê tường minh, Boundary 4) — không phải entity mới phát sinh ở Round 3.

---

## 1. Table Specifications

### 1.1 `roadmap_node_knowledge_node` (Dependency Edge)

**Purpose:** Ghi nhận 1 `RoadmapNode` phụ thuộc/yêu cầu hiểu 1 `KnowledgeNode` cụ thể (ví dụ RoadmapNode "Upload Video" phụ thuộc KnowledgeNode `HTTP`, `Multipart Form`, `Streams`, `Validation`, `Storage` — ví dụ gốc từ [DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md)). Đây là cầu nối **duy nhất** giữa Roadmap Graph và Knowledge Graph ([DECISION-015](../11_Decisions/DECISION-015-Knowledge-Engine.md) — 2 graph tách biệt, không trộn cấu trúc).

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `roadmap_node_knowledge_node_id` | `uuid` | NOT NULL | `gen_random_uuid()` | **PK** |
| `roadmap_node_id` | `uuid` | NOT NULL | — | FK → `roadmap_node` |
| `knowledge_node_id` | `uuid` | NOT NULL | — | FK → `knowledge_node` |
| `removed_at` | `timestamptz` | NULL | — | NULL = dependency đang hiệu lực; NOT NULL = đã bị gỡ qua 1 thay đổi cấu trúc được phê duyệt — **không hard delete**, nhất quán với nguyên tắc Soft Delete đã chốt ([PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 4: trạng thái nghiệp vụ cụ thể, không cờ chung) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit — thực tế thường `ai_service` (AI đề xuất Dependency Edge khi tạo/mở RoadmapNode) |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |

**Không có `updated_at`/`updated_by_*` tách riêng** — `removed_at` là trường mutable duy nhất, đủ để biểu diễn toàn bộ vòng đời (Created → Removed), không cần nhóm audit "updated" đầy đủ vì không có trường nội dung nào khác có thể sửa (quan hệ phụ thuộc chỉ có "tồn tại" hoặc "không còn tồn tại", không có "sửa nội dung").

**PK:** `roadmap_node_knowledge_node_id`.

**FK:**
- `roadmap_node_id → roadmap_node(roadmap_node_id)` — `ON DELETE CASCADE` (cùng phạm vi Aggregate `Roadmap`/Boundary 3, giống cách `roadmap_node` tự tham chiếu đã thiết kế ở Round 1 — lý thuyết, vì `roadmap_node` không hard-delete trong thực tế)
- `knowledge_node_id → knowledge_node(knowledge_node_id)` — `ON DELETE RESTRICT` (**bắt buộc** — nhất quán Delete Rule Review đã áp dụng cho mọi FK trỏ tới `knowledge_node` ở Round 2; xem mục 4)

**Unique Constraints:** `uq_roadmap_node_knowledge_node_active` — `UNIQUE (roadmap_node_id, knowledge_node_id) WHERE removed_at IS NULL` (**partial unique index**, PostgreSQL hỗ trợ native — Supabase tương thích) — ngăn 2 dependency "đang hiệu lực" trùng lặp cho cùng 1 cặp, nhưng vẫn cho phép lịch sử (gỡ rồi thêm lại) tồn tại nhiều row.

**Check Constraints:**
- `ck_roadmap_node_knowledge_node_created_by_actor_type` — enum đóng (`learner`/`backend_core`/`ai_service`)

**Versioning:** Không áp dụng — không có rủi ro ghi đồng thời được xác định (thay đổi luôn qua quy trình Roadmap Governance tuần tự, không có 2 luồng ghi cạnh tranh).

**Audit Strategy:** Chỉ nhóm created + `removed_at` riêng — không phải "Current State Snapshot" đầy đủ kiểu `roadmap_node` (không có nội dung để "update", chỉ có "tồn tại/đã gỡ").

**History Strategy:** **Không cần History Table** — bản thân việc giữ row cũ (`removed_at` thay vì xóa) **đã là lịch sử đầy đủ** — không cần bảng `history.*` riêng vì không có "giá trị cũ" nào bị mất khi `removed_at` được set (khác với `roadmap`/`roadmap_node`, nơi nội dung thật sự bị ghi đè).

**Retention Strategy:** Vĩnh viễn — không xóa row dù dependency đã bị gỡ (giữ nguyên lịch sử "RoadmapNode này từng phụ thuộc KnowledgeNode nào, từ khi nào tới khi nào").

**Write-owner:** Goal & Roadmap Domain (cùng domain với `roadmap_node` — bảng nối được tạo khi AI đề xuất/Learner phê duyệt cấu trúc Roadmap có phụ thuộc Knowledge cụ thể; Knowledge Graph Domain chỉ được **đọc**, không sở hữu bảng này, đúng [DECISION-015](../11_Decisions/DECISION-015-Knowledge-Engine.md) mục "Dependency Edge (Roadmap→Knowledge) không ảnh hưởng cấu trúc KnowledgeEdge").

---

### 1.2 `expansion_record` (Knowledge Module)

**Purpose:** Ghi nhận 1 lần Knowledge Node Expansion loại **Deep/Structural** ([DECISION-023](../11_Decisions/DECISION-023-Controlled-Knowledge-Expansion.md)) — bắt buộc hiển thị lý do cho Learner, khác với Local Expansion (chỉ cần log nội bộ, không cần `expansion_record`).

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `expansion_record_id` | `uuid` | NOT NULL | sinh ở Application Layer (ULID-style) | **PK** |
| `knowledge_node_id` | `uuid` | NOT NULL | — | FK → `knowledge_node` — node **đang được mở rộng** (node cha) |
| `expansion_class` | `text` | NOT NULL | — | `deep` / `structural` — 🔶 **suy luận của Claude**: [KnowledgeGraphModel.md](../../AI/KnowledgeEngine/KnowledgeGraphModel.md) luôn mô tả 2 loại này cùng 1 hành vi ("Deep/Structural" gộp chung 1 dòng trong bảng tiêu chí) — tách thành 2 giá trị riêng ở đây là để không mất thông tin nếu sau này 2 loại cần phân biệt báo cáo/thống kê, nhưng **chưa có Decision Log nào yêu cầu tách** — có thể gộp thành 1 giá trị duy nhất (`deep_structural`) nếu Founder/ChatGPT thấy không cần phân biệt |
| `expansion_reason` | `text` | NOT NULL | — | Lý do mở rộng — **bắt buộc hiển thị cho Learner** (DECISION-023, không phải tùy chọn) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit — thực tế luôn `ai_service` |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |

**Không có `updated_at`/`updated_by_*`** — append-only, immutable (cùng nhóm với `knowledge_edge`/`evidence`/`assessment_result` — quyết định Expansion không bao giờ sửa lại sau khi ghi nhận).

**PK:** `expansion_record_id`.

**FK:** `knowledge_node_id → knowledge_node(knowledge_node_id)` — `ON DELETE RESTRICT`.

**🔶 Quyết định thiết kế cần nêu rõ — KHÔNG có FK trực tiếp tới `knowledge_edge`:** [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 2 chỉ chốt cardinality `KnowledgeNode — ExpansionRecord` (1 — *), **không chốt** `ExpansionRecord — KnowledgeEdge`. Một lần Expansion "Deep" có thể tạo **nhiều** `knowledge_edge` cùng lúc (mở nhiều cấp trong 1 lượt, theo định nghĩa "Deep" ở [KnowledgeGraphModel.md](../../AI/KnowledgeEngine/KnowledgeGraphModel.md)) — quan hệ 1-* hoặc *-* giữa `ExpansionRecord` và `KnowledgeEdge` **chưa được Domain Architecture chốt**, nên Round 3 **không tự thêm** FK/bảng nối cho quan hệ này (nhất quán nguyên tắc đã áp dụng ở Round 2 — không tự thêm cấu trúc ngoài những gì đã khóa). Hệ quả: **không có cách truy vết DB-native nào** từ 1 `knowledge_edge` cụ thể ngược về đúng `expansion_record` đã tạo ra nó — chỉ biết "node X đã từng được Expand, lý do Y", không biết chính xác cạnh nào sinh ra từ lần Expand nào nếu có nhiều lần Expand trên cùng 1 node. Ghi nhận ở mục 3 (Explainability Integrity) và Risks.

**Unique Constraints:** không có — 1 `knowledge_node` có thể được Expand nhiều lần qua thời gian.

**Check Constraints:**
- `ck_expansion_record_expansion_class` — `expansion_class IN ('deep','structural')` — **đề xuất**, xem ghi chú cột
- `ck_expansion_record_reason_not_empty` — `length(trim(expansion_reason)) > 0` (bắt buộc hiển thị, không cho phép rỗng — cùng tinh thần `ck_assessment_result_reasoning_not_empty` ở Round 2)
- `ck_expansion_record_created_by_actor_type` — enum đóng

**Versioning:** Không áp dụng (immutable).

**Audit Strategy:** chỉ nhóm created — **chính nó là artifact explainability** cho Expansion, giống vai trò `assessment_result` cho Assessment ([DDL_ROUND2_REVIEW.md](DDL_ROUND2_REVIEW.md)/[ROUND2_ARCHITECTURE_REVIEW.md](ROUND2_ARCHITECTURE_REVIEW.md) mục C).

**History Strategy:** Không áp dụng — append-only.

**Retention Strategy:** Vĩnh viễn.

**Write-owner:** Knowledge Graph Domain.

---

## 2. Constraint Specifications (tổng hợp)

| Bảng | Unique | Check | FK quan trọng |
|---|---|---|---|
| `roadmap_node_knowledge_node` | `uq_roadmap_node_knowledge_node_active` (partial, `WHERE removed_at IS NULL`) | `ck_*_created_by_actor_type` | `roadmap_node_id` `ON DELETE CASCADE`; `knowledge_node_id` `ON DELETE RESTRICT` |
| `expansion_record` | — | `ck_expansion_record_expansion_class` *(đề xuất)*, `ck_expansion_record_reason_not_empty`, `ck_*_created_by_actor_type` | `knowledge_node_id` `ON DELETE RESTRICT` |

---

## 3. Relationship Validation

| Quan hệ đã chốt | Cardinality đã chốt | Thiết kế Round 3 | Khớp? |
|---|---|---|---|
| `RoadmapNode` — `KnowledgeNode` (Dependency Edge) | * — * | `roadmap_node_knowledge_node` (bảng nối, `removed_at` cho lịch sử) | ✅ |
| `KnowledgeNode` — `ExpansionRecord` | 1 — * | `expansion_record.knowledge_node_id → knowledge_node`, không UNIQUE | ✅ |

**Đối chiếu Aggregate Boundary:** `roadmap_node_knowledge_node` không mở Boundary mới — về bản chất là dữ liệu thuộc Aggregate `Roadmap` (Boundary 3, write-owner Goal & Roadmap Domain), chỉ **tham chiếu** sang Aggregate `KnowledgeNode` (Boundary 4) qua `knowledge_node_id`, không sở hữu nó — đúng nguyên tắc DECISION-015 "Dependency Edge không ảnh hưởng cấu trúc KnowledgeEdge". `expansion_record` đúng là con trong Aggregate `KnowledgeNode` (Boundary 4 mở rộng, cùng nhóm với `knowledge_edge`).

**Không phát hiện sai lệch cardinality nào.**

---

## 4. Delete Rule Review (tiếp nối Round 2)

Bổ sung 2 FK mới trỏ tới `knowledge_node` vào bảng tổng hợp đã có ở [ROUND2_ARCHITECTURE_REVIEW.md](ROUND2_ARCHITECTURE_REVIEW.md) mục E:

| FK | `ON DELETE` | Hệ quả |
|---|---|---|
| `roadmap_node_knowledge_node.knowledge_node_id` | `RESTRICT` | Không xóa được `knowledge_node` nếu còn ≥1 dependency (active hoặc đã removed — `removed_at` không ảnh hưởng FK, row vẫn tồn tại) trỏ tới nó |
| `expansion_record.knowledge_node_id` | `RESTRICT` | Không xóa được `knowledge_node` nếu còn ≥1 `expansion_record` ghi nhận nó từng được mở rộng |

**Kết luận: vẫn giữ đúng 100% FK trỏ tới `knowledge_node` là `RESTRICT`** — không có ngoại lệ nào được thêm ở Round 3, nhất quán với kết luận Delete Rule Review ở Round 2.

---

## 5. RLS Impact Notes (Supabase)

| Bảng | Boundary RLS đề xuất | Đặc điểm |
|---|---|---|
| `roadmap_node_knowledge_node` | Qua `roadmap_node.roadmap_id → roadmap.goal_id → goal.learner_id` | **3-hop JOIN** — sâu nhất trong toàn bộ Step 4B tới giờ (Round 1 đã ghi nhận `roadmap_node` cần 2-hop; bảng nối này cộng thêm 1 hop nữa). Cùng vấn đề đã flag ở [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md) mục 4 — càng về sau, vấn đề denormalize `learner_id` để giảm hop càng đáng cân nhắc hơn |
| `expansion_record` | **Không theo `learner_id`** — cùng pattern shared/global như `knowledge_node`/`knowledge_edge` (Round 2 mục 4): đọc công khai cho `authenticated`, ghi qua service role | `expansion_record` mô tả sự kiện xảy ra trên Knowledge Graph dùng chung, không thuộc riêng 1 Learner — Learner chỉ "nhìn thấy" nó khi đang học đúng node liên quan, không phải vì họ "sở hữu" nó |

---

## 6. Risks

| # | Rủi ro | Mức độ | Ghi chú |
|---|---|---|---|
| 1 | **`ExpansionRecord` không có FK tới `knowledge_edge` cụ thể** (mục 1.2) — không truy vết được chính xác cạnh nào sinh ra từ lần Expand nào nếu 1 node bị Expand nhiều lần | **Medium** | Cần Founder/ChatGPT xác nhận cardinality `ExpansionRecord ↔ KnowledgeEdge` trước khi thêm — chưa tự quyết định |
| 2 | **`expansion_class` (`deep`/`structural`) là suy luận của Claude, có thể không cần phân biệt** — Domain Architecture luôn mô tả 2 loại này cùng hành vi | Low | Dễ sửa (gộp 2 giá trị thành 1, hoặc bỏ CHECK) nếu Founder xác nhận không cần tách |
| 3 | **`roadmap_node_knowledge_node` cần 3-hop JOIN cho RLS** — sâu nhất tới giờ trong Step 4B | Medium | Cộng dồn với rủi ro tương tự đã ghi ở Round 1 (`roadmap_node` 2-hop) — khuyến nghị xem xét denormalize `learner_id` 1 lần cho toàn bộ nhánh Roadmap, không xử lý riêng từng bảng |
| 4 | **`expansion_record` có cùng integrity gap với `trace_link`** — không có gì ở tầng DB bắt buộc 1 `knowledge_edge` được tạo do Deep/Structural Expansion phải có `expansion_record` tương ứng (quan hệ chỉ ngụ ý qua quy ước Application Layer, không có FK 2 chiều bắt buộc) | **Medium-High** | Xem mục 3 (Explainability Integrity) ở [ROUND3_ARCHITECTURE_REVIEW.md](ROUND3_ARCHITECTURE_REVIEW.md) — cùng bản chất rủi ro với `trace_link` đã ghi ở Round 2 |
| 5 | **`uq_roadmap_node_knowledge_node_active` dùng partial unique index** — kỹ thuật PostgreSQL hợp lệ, nhưng là điểm đầu tiên trong toàn bộ Step 4B dùng tính năng này — cần xác nhận Supabase managed Postgres không có hạn chế nào với partial index (không có lý do nghi ngờ, nhưng chưa kiểm chứng thực tế) | Low | Ghi nhận, không phải blocker |

## Liên kết ngược

[DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md), [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md), [ROUND2_ARCHITECTURE_REVIEW.md](ROUND2_ARCHITECTURE_REVIEW.md), [LogicalDatabaseModel.md](LogicalDatabaseModel.md), [DECISION-015](../11_Decisions/DECISION-015-Knowledge-Engine.md), [DECISION-023](../11_Decisions/DECISION-023-Controlled-Knowledge-Expansion.md).

**Đánh giá: [DDL_ROUND3_REVIEW.md](DDL_ROUND3_REVIEW.md) và [ROUND3_ARCHITECTURE_REVIEW.md](ROUND3_ARCHITECTURE_REVIEW.md). Chưa có SQL/API/Frontend nào được tạo.**
