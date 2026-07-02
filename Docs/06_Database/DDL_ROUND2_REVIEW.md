# DDL Round 2 Review — Knowledge + Evidence + Assessment + Traceability

> Đánh giá [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md) trước khi cho phép sinh SQL thật.

## 1. Consistency

| Kiểm tra | Kết quả |
|---|---|
| Mọi entity đã khóa trong phạm vi (`KnowledgeNode`, `KnowledgeEdge`, `KnowledgeNodeMastery`, `Evidence`, `EvidenceLink`, `AssessmentResult`, `TraceLink`) có Table Specification | ✅ Đủ 7/7 |
| Naming khớp [DatabaseNamingConvention.md](DatabaseNamingConvention.md) (snake_case, `<table>_id`, `uq_`/`ck_` prefix, audit columns) | ✅ Khớp toàn bộ |
| ID Strategy khớp [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 2 (ULID-style cho append-only: `knowledge_edge`, `evidence`, `evidence_link`, `assessment_result`, `trace_link`; `gen_random_uuid()` cho Snapshot: `knowledge_node`, `knowledge_node_mastery`) | ✅ Khớp |
| Audit/Versioning/History áp dụng đúng theo nhóm entity | ✅ — `knowledge_node_mastery` có `version_number` bắt buộc (rủi ro ghi đồng thời cao nhất, đúng DECISION-044); 5 bảng append-only không có `updated_at`/version/History Table |
| Check Constraint cho mọi cột enum | ✅ Có đủ, một số đánh dấu rõ "đề xuất/danh sách mở" thay vì khóa cứng khi Domain Architecture chưa chốt |
| 3 điểm reconciliation (mục 0, [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md)) được xử lý nhất quán, không tự quyết định | ✅ — đã chọn phương án bám sát Decision Log đã khóa (DECISION-022/026), ghi nhận khác biệt rõ ràng thay vì lặng lẽ làm theo yêu cầu Round 2 nếu yêu cầu đó mâu thuẫn Decision Log |

**Không phát hiện mâu thuẫn nội bộ trong 7 bảng đã thiết kế.**

## 2. Domain Alignment

| Kiểm tra | Kết quả |
|---|---|
| Cardinality khớp [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 2 | ✅ Đối chiếu đầy đủ ở [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md) mục 3 |
| Ownership khớp [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 5 | ✅ — `knowledge_node_mastery` giữ đúng write-owner Assessment Domain dù được nhóm tài liệu vào "Knowledge Module" theo yêu cầu Round 2 (mục 0.3) |
| Aggregate Boundary khớp [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 5 (Boundary 4, 5, 6, 7) | ✅ `evidence_link.evidence_id ON DELETE CASCADE` đúng phạm vi Aggregate `Evidence` (Boundary 5); không Cascade nào vượt Aggregate |
| `TraceLink` không bị gán Core Domain nào | ✅ Đúng DECISION-038 |
| **`positive_evidence`/`negative_evidence` (DECISION-022)** | ✅ **Không vi phạm** — đã chọn không tạo bảng riêng, map vào `evidence_link.stance`, giữ đúng tinh thần "support/refute là per-link, không phải per-Evidence" |
| **`assessment` (entity wrapper)** | ✅ **Không vi phạm** — không tạo entity ngoài Domain Architecture đã khóa, ghi nhận làm Open Question (Risk #2) thay vì tự quyết định |
| **`ExpansionRecord` (Boundary 4, đã khóa nhưng ngoài phạm vi Round 2)** | 🔶 **Gap đã biết, không phải vi phạm** — flagged rõ ở Risk #3, không tự thêm bảng (khác cách xử lý ở Round 1) |

## 3. Learning Philosophy Alignment

> Đối chiếu trực tiếp 5 nguyên tắc được yêu cầu kiểm tra.

| Nguyên tắc | Đối chiếu thiết kế Round 2 | Đạt? |
|---|---|---|
| **Không học vẹt** | `assessment_result` lưu đủ 4 cấp độ (Remember/Explain/Apply/Teach) **mỗi lượt đánh giá**, không chỉ 1 điểm số tổng — một câu trả lời đúng ở Apply không tự động được tính là "hiểu" nếu Remember/Explain chưa đạt; `knowledge_node_mastery` tách biệt 3 cấp độ binary + 1 composite, không gộp thành 1 trạng thái duy nhất | ✅ |
| **Hiểu quan trọng hơn hoàn thành** | Không có cột nào đại diện "hoàn thành task" tách biệt khỏi mastery — `evidence_link.target_mastery_dimension` luôn bắt buộc gắn 1 cấp độ hiểu cụ thể, không có khái niệm "đã làm xong" độc lập với "đã hiểu" | ✅ |
| **Mọi kiến thức phải gắn với dự án** | 🔶 **Không kiểm chứng được ở tầng Database Round 2** — quan hệ "KnowledgeNode gắn với dự án/Goal cụ thể" nằm ở `RoadmapNode ↔ KnowledgeNode` (Dependency Edge, Round 1/Roadmap Module), không phải ở Knowledge/Evidence/Assessment Module. `knowledge_node` tự thân **không có FK bắt buộc** tới bất kỳ Roadmap/Goal nào (đúng thiết kế — KnowledgeNode dùng chung, không thuộc 1 dự án) — nguyên tắc này được thực thi ở Roadmap Module (Round 1), không phải Round 2. Không vi phạm, nhưng cần xác nhận composability giữa 2 Round vẫn đúng (xem [ROUND2_ARCHITECTURE_REVIEW.md](ROUND2_ARCHITECTURE_REVIEW.md) câu 3) | ✅ (gián tiếp, qua Round 1) |
| **AI phải giải thích được lý do đánh giá** | `assessment_result.reasoning` bắt buộc `NOT NULL` + `CHECK` không rỗng; `trace_link` bắt buộc tồn tại nối `assessment_result` → `evidence`/`evidence_link` nguồn — đây chính là yêu cầu Explainability First (DECISION-027) được thực thi đầy đủ ở tầng bảng | ✅ |
| **AI phải thích nghi với từng learner** | `knowledge_node_mastery` là 1 row / (Learner × KnowledgeNode) — không có giá trị mastery "chung" nào áp dụng cho mọi Learner; `evidence`/`assessment_result` đều gắn `learner_id` trực tiếp, không có shared state nào giữa các Learner ngoài `knowledge_node`/`knowledge_edge` (đúng — graph tri thức nên dùng chung, "thích nghi" nằm ở Mastery/Evidence cá nhân hóa, không nằm ở định nghĩa tri thức) | ✅ |

**Không phát hiện vi phạm Learning Philosophy nào ở 7 bảng Round 2.** Điểm cần theo dõi: "Mọi kiến thức phải gắn với dự án" phụ thuộc tính đúng đắn của Round 1 (Dependency Edge), không tự đứng vững riêng ở Round 2 — đây là **coupling cố ý, theo đúng kiến trúc đã chốt** (Roadmap Graph ≠ Knowledge Graph, [DECISION-015](../11_Decisions/DECISION-015-Knowledge-Engine.md)), không phải lỗ hổng.

## 4. Supabase Alignment

| Kiểm tra | Kết quả |
|---|---|
| PK/FK dùng `uuid`, naming `snake_case` | ✅ Nhất quán DECISION-042/043 |
| Recursive CTE cho `knowledge_edge` traversal | ✅ Không cột/cấu trúc nào cản trở (không `parent_id`, không closure table — đúng DECISION-039) |
| `jsonb` cho `evidence.raw_reference`, `*.teach_capability_scores` | ✅ Đúng hướng đã xác nhận ở [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md) mục 2.4 (jsonb là nâng cấp so với SQL Server JSON) |
| Versioning `version_number` cho `knowledge_node_mastery` | ✅ Đúng DECISION-044 |
| History Table cho `knowledge_node` | ✅ Đúng DECISION-045 (nhóm "không có companion log") |
| RLS — `knowledge_node`/`knowledge_edge` là shared/global table, cần role-based policy khác Round 1 | 🔶 Ghi nhận rõ (mục 4 [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md)), chưa viết policy thật (ngoài phạm vi) |
| RLS — `trace_link` không có pattern đơn giản (đa hình) | 🔶 Ghi nhận, khuyến nghị mediated qua Backend — không chặn `CREATE TABLE` |

**Không phát hiện vi phạm Platform Alignment (DECISION-042..045) nào.**

## 5. Constraint Completeness

| Loại constraint | Bao phủ |
|---|---|
| Primary Key | 7/7 bảng |
| Foreign Key | Đủ cho mọi quan hệ có FK vật lý; `trace_link` cố ý không có FK (đa hình, đúng DECISION-038) |
| Unique | 1 khóa cứng (`uq_knowledge_node_mastery_learner_id_knowledge_node_id`) + 3 đề xuất chưa khóa (`knowledge_edge`, `evidence_link`, `trace_link`) |
| Check | Đủ cho mọi cột enum/range — 1 số đánh dấu rõ "đề xuất, danh sách mở" khi Domain Architecture chưa chốt (`domain_category`, `relation_type`) thay vì khóa cứng sai |
| NOT NULL | Áp dụng đúng theo append-only (chỉ `created_*`) vs Snapshot (`created_*` + `updated_*`) |

**Khoảng trống còn lại, có chủ đích, không phải thiếu sót:**
1. `trace_link.source_id`/`target_id` không có FK vật lý — đánh đổi cố ý của DECISION-038, Application Layer phải tự đảm bảo.
2. 3 Unique Constraint đề xuất (`knowledge_edge`, `evidence_link`, `trace_link`) chưa khóa cứng — cần Founder/ChatGPT xác nhận trước Step kế tiếp.

**Constraint Completeness: đầy đủ cho phạm vi Round 2**, không có cột nào thiếu ràng buộc nó cần.

## 6. Kết luận sơ bộ

Xem [ROUND2_ARCHITECTURE_REVIEW.md](ROUND2_ARCHITECTURE_REVIEW.md) cho 5 câu hỏi kiến trúc bắt buộc — kết luận `READY_FOR_SQL_GENERATION`/`NEEDS_REVISION` cuối cùng được tổng hợp ở tài liệu đó (gồm cả kết quả Review này).

## Liên kết ngược

[DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md), [DatabaseBlueprint.md](DatabaseBlueprint.md), [LogicalDatabaseModel.md](LogicalDatabaseModel.md), [ROUND2_ARCHITECTURE_REVIEW.md](ROUND2_ARCHITECTURE_REVIEW.md).
