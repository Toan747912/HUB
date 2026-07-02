# Database Blueprint Review — AI Mentor OS

> Đánh giá [DatabaseBlueprint.md](DatabaseBlueprint.md) (Step 4A) trước khi cho phép Step 4B (DDL Generation, [DECISION-040](../11_Decisions/DECISION-040-Physical-Database-Design-Split.md)) bắt đầu.

## 1. Consistency

| Kiểm tra | Kết quả |
|---|---|
| Mọi entity ở [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 1 (18 entity) + `TraceLink` đều có Entity Blueprint | ✅ Đủ 19/19 |
| Mỗi entity có đúng 1 domain write-owner (không entity nào bị ghi bởi 2 domain) | ✅ Khớp [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 5 — không phát sinh ownership mới |
| PK Strategy của mọi entity khớp phân nhóm ULID/Sequential ở [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 2 | ✅ Khớp — không có entity nào bị gán nhóm sai hoặc bị bỏ sót |
| Reference Rule (Cascade/Restrict/Archive) ở Relationship Matrix khớp [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 6 | ✅ Khớp — không có quan hệ Cascade nào vượt ra ngoài 1 Aggregate |
| `TraceLink` không bị gán vào Core Domain nào (đúng theo DECISION-038) | ✅ Đúng — module `Traceability` được đánh dấu rõ "không phải Core Domain" |
| Knowledge Graph storage khớp DECISION-039 (bảng quan hệ + Recursive CTE, không Graph Extensions) | ✅ `KnowledgeNode`/`KnowledgeEdge` Blueprint và Index Strategy #4 đều theo mô hình bảng quan hệ |
| Aggregate Boundary (11 Boundary) khớp [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 5 | ✅ Mỗi entity trong Blueprint trỏ đúng Boundary đã chốt, không mở rộng thêm |

**Không phát hiện mâu thuẫn giữa Database Blueprint và Domain/Logical Model đã khóa.**

## 2. Risks

Kế thừa nguyên trạng từ Step 1-3 (không lặp lại chi tiết, chỉ xác nhận còn áp dụng ở mức Blueprint):

| # | Rủi ro | Mức độ | Trạng thái ở Step 4A |
|---|---|---|---|
| 1 | Ghi đồng thời lên `KnowledgeNodeMastery` (PersistenceArchitecture.md Risk #1) | Trung bình-Cao | Vẫn mở — Blueprint đã gắn yêu cầu concurrency token, cơ chế cụ thể (rowversion) để Step 4B chọn |
| 2 | Không có cơ chế "retract" cho `KnowledgeEdge` sai (PersistenceArchitecture.md Risk #2) | Trung bình | Vẫn mở — không chặn DDL, vì append-only vẫn lưu trữ được dù chưa có cơ chế retract |
| 3 | Đồng bộ trạng thái Archive giữa `Goal`/`Roadmap`/`LearningSession` (LogicalDatabaseModel.md Risk #2) | Trung bình | Vẫn mở — Relationship Matrix mục 2 ghi nhận "Archive cùng nhau" ở mức quan hệ nhưng chưa có transaction kỹ thuật cụ thể; để Step 4B/Application Layer quyết định |
| 4 | Anonymization chạm hầu hết entity có `learner_id` (LogicalDatabaseModel.md Risk #3) | Trung bình | Vẫn mở — Blueprint xác nhận mọi quan hệ tới `Learner` đều dùng Archive Behavior "Anonymize", nhất quán xuyên 19 entity |
| 5 | `KnowledgeEdge` tăng nhanh khi graph mở rộng (LogicalDatabaseModel.md Risk #4) | Thấp (đã chấp nhận) | Không đổi — DECISION-039 không thêm/giảm rủi ro này |
| 6 | `Evidence`/`KnowledgeNode` chưa có cơ chế version/retract nội dung (Open Question #4 kế thừa) | Thấp-Trung bình | Vẫn mở — Blueprint đánh dấu 🔶 ở `KnowledgeNode` mục Versioning, không tự quyết định |

**Rủi ro mới phát sinh khi viết Blueprint (chưa từng ghi nhận ở Step 1-3):**

7. **`Goal` không có UNIQUE constraint đơn giản cho "Goal hiện hành"** — invariant "đúng 1 Goal chưa-superseded / Learner" chỉ diễn đạt được rõ qua chuỗi `supersedes`/`superseded_by`, không phải 1 cột boolean/flag (tránh lặp lại lỗi "is_deleted tổng quát" đã cấm ở PhysicalDesignPreparation.md mục 4). Step 4B cần chọn cách thực thi (filtered index theo điều kiện "không có Goal nào trỏ `supersedes` tới nó" hoặc kiểm tra ở Application Layer) — không phải blocker, nhưng cần quyết định rõ trước khi viết constraint. Mức độ: Thấp.

## 3. Missing Entities

Rà soát ngược: không phát hiện entity nào trong Domain Architecture/Logical Model bị bỏ sót khỏi Blueprint, và không phát hiện entity nào trong Blueprint không có nguồn gốc từ Domain Architecture đã khóa.

- `LearningProfile` **đúng là không xuất hiện** — Projection, không có persistence boundary riêng (DECISION-036), đã xác nhận lại ở mục 0 của Blueprint.
- `TraceLink` **đúng là có xuất hiện** dù không phải Core Domain — hạ tầng cross-cutting đã khóa ở DECISION-038.
- Không phát hiện nhu cầu thêm bảng "join"/nối mới ngoài những gì Logical Model đã ngụ ý (ví dụ `RoadmapNode`–`KnowledgeNode` M:N cần 1 bảng nối vật lý ở Step 4B, nhưng đây là chi tiết DDL, không phải entity logic mới — không cần entity riêng ở Blueprint).

**Kết luận: không có Missing Entity.**

## 4. Naming Issues

| # | Vấn đề | Khuyến nghị |
|---|---|---|
| 1 | **"Explain" collision đã biết từ DECISION-017** — "Explain" vừa là Mastery Level 2 (trên `KnowledgeNodeMastery`/`AssessmentResult`) vừa là 1 sub-capability của Teach (Capability Cluster). Blueprint hiện chưa đặt tên cột (đúng phạm vi Step 4A), nhưng **Step 4B phải dùng tên định danh rõ ràng** — ví dụ `mastery_explain_level` (Mastery Level 2) khác `teach_explain_subscore` (Teach sub-capability) — không dùng chung 1 tên cột `explain` mơ hồ. | Ghi nhận làm ràng buộc bắt buộc cho Step 4B, không tự đặt tên cột ở đây. |
| 2 | **`source_type`/`target_type` trên `TraceLink` là enum đa hình** — cần 1 danh sách giá trị cố định, đóng (không phải free-text), khớp đúng 3 nhóm đã xác định ở [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 6 (Scope). Nếu để mở, vi phạm tinh thần "định kiểu rõ" mà DECISION-038 đặt ra khi từ chối Polymorphic FK tự do. | Step 4B cần định nghĩa enum/check constraint cho 2 cột này, không để `nvarchar` tự do. |
| 3 | **`RoadmapNode` và `Know1edgeNode` đều có khái niệm "tự tham chiếu" nhưng bản chất khác nhau** (cây 1 cha vs DAG nhiều cha qua Edge) — đã phân biệt rõ ở Blueprint (`parent_roadmap_node_id` cột trực tiếp vs `KnowledgeEdge` bảng riêng), nhưng **tên cột cần tránh đặt giống nhau theo kiểu generic `parent_id`** ở 2 bảng khác bản chất, để không gây nhầm lẫn khi đọc DDL sau này. | Ghi nhận cho Step 4B — không phải lỗi ở Blueprint, chỉ là điểm cần cẩn trọng khi đặt tên cột thực tế. |

**Không phát hiện naming issue nào ảnh hưởng tới cấu trúc Blueprint hiện tại** — cả 3 điểm trên là ràng buộc/khuyến nghị cho Step 4B, không yêu cầu sửa lại `DatabaseBlueprint.md`.

## 5. Ready for DDL?

**✅ READY_FOR_DDL**

Lý do:
- Consistency (mục 1): không có mâu thuẫn nào giữa Blueprint và Domain/Logical Model đã khóa.
- Risks (mục 2): toàn bộ là rủi ro **đã biết, không mới, không blocking** — kể cả rủi ro mới phát sinh (#7) chỉ ảnh hưởng cách viết 1 constraint cụ thể, không ảnh hưởng khả năng thiết kế bảng.
- Missing Entities (mục 3): không có.
- Naming Issues (mục 4): cả 3 điểm là ràng buộc cần tuân thủ ở Step 4B, không phải lỗi cần sửa lại Blueprint trước khi viết DDL.
- [DECISION-039](../11_Decisions/DECISION-039-Knowledge-Graph-Persistence.md) đã đóng điểm kỹ thuật cuối cùng còn mở ở Nhóm A của [PHYSICAL_DESIGN_READINESS.md](PHYSICAL_DESIGN_READINESS.md) mục 3 (lựa chọn mô hình Knowledge Graph).

**Có thể bắt đầu Step 4B — DDL Generation** (`CREATE TABLE`, cột, kiểu dữ liệu, constraint, index cụ thể) — dựa trên `DatabaseBlueprint.md`, áp dụng các ràng buộc đặt tên ở mục 4 và xử lý rủi ro #7 (Goal uniqueness) khi viết constraint cụ thể.

## Liên kết ngược

[DatabaseBlueprint.md](DatabaseBlueprint.md), [LogicalDatabaseModel.md](LogicalDatabaseModel.md), [PersistenceArchitecture.md](PersistenceArchitecture.md), [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md), [PHYSICAL_DESIGN_READINESS.md](PHYSICAL_DESIGN_READINESS.md), [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-039](../11_Decisions/DECISION-039-Knowledge-Graph-Persistence.md), [DECISION-040](../11_Decisions/DECISION-040-Physical-Database-Design-Split.md).
