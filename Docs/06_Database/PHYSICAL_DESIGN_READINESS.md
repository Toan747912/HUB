# Physical Design Readiness — AI Mentor OS

> Trạng thái: Báo cáo kết luận cuối Database Design Phase, Step 3 (không phải Decision Log). Tổng hợp Step 1-3 ([PersistenceArchitecture.md](PersistenceArchitecture.md), [LogicalDatabaseModel.md](LogicalDatabaseModel.md), [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md)) để trả lời 1 câu hỏi duy nhất: **có thể bắt đầu Physical Database Design (Step 4 — `CREATE TABLE`, cột, index, constraint) chưa?**

## 1. Checklist tổng hợp Step 1-3

| Step | Deliverable | Trạng thái |
|---|---|---|
| 1 — Persistence Architecture | Domain Persistence Matrix, Storage Pattern theo domain | ✅ Hoàn thành ([PersistenceArchitecture.md](PersistenceArchitecture.md)) |
| 2 — Logical Database Model | 18 Candidate Entities, Relationships/Cardinalities, Ownership, Lifecycle, Aggregate Boundary, Reference Rules, ERD text | ✅ Hoàn thành, **READY toàn phần** sau DECISION-038 ([LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 10) |
| 3 — Physical Design Preparation | ID Strategy, Audit Strategy, Soft Delete Strategy, Versioning Strategy (đề xuất), `TraceLink` Model (thiết kế, DECISION-038), SQL Server Suitability | ✅ Hoàn thành ([PhysicalDesignPreparation.md](PhysicalDesignPreparation.md)) |

Không có deliverable nào trong 3 Step còn ở trạng thái "chưa làm" hoặc "thiếu nội dung cốt lõi".

## 2. Đối chiếu Risk/Open Question đã đóng qua Step 1-3

| Nguồn | Vấn đề | Trạng thái |
|---|---|---|
| PersistenceArchitecture.md Open Question #1 | "Memory Profile" có phải `LearningProfile` | ✅ Đóng — DECISION-036 |
| PersistenceArchitecture.md Risk #3 / Open Question #5 | Right-to-be-forgotten xung đột retention vĩnh viễn | ✅ Đóng — DECISION-037 |
| LogicalDatabaseModel.md Risk #1 / Open Question #1 | Tham chiếu đa hình `traced_to[]`/Evidence References | ✅ Đóng — DECISION-038 (`TraceLink`) |

**Cả 3 điểm từng khiến Readiness Assessment ở các Step trước phải gắn nhãn 🟡/caveat đều đã đóng.** Không có Risk/Open Question nào còn lại được phân loại "blocking" trong toàn bộ Database Design Phase tính đến Step 3.

## 3. Các điểm còn mở — phân loại lại theo mức ảnh hưởng

Để tránh đánh giá sai mức độ sẵn sàng, phân loại rõ 2 nhóm câu hỏi còn tồn đọng:

### Nhóm A — Đề xuất (proposal) cần Founder/ChatGPT xác nhận, nhưng KHÔNG chặn việc bắt đầu Physical Design

(Vì đây là lựa chọn kỹ thuật có thể đổi sau mà không phải sửa lại Domain/Logical Model — chỉ ảnh hưởng cách viết DDL cụ thể)

- ID Strategy (Hybrid: ULID-style cho append-only, sequential-friendly cho snapshot, định danh public riêng) — [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 2.
- Audit Strategy (Temporal Tables hay tự viết audit log) — mục 3.
- Soft Delete Strategy (trạng thái nghiệp vụ cụ thể, không dùng cờ `is_deleted` chung) — mục 4.
- Versioning Strategy (`rowversion` cho entity rủi ro ghi đồng thời) — mục 5.
- Lựa chọn mô hình lưu Knowledge Graph: bảng quan hệ + Recursive CTE **(đề xuất nghiêng về hướng này)** vs SQL Server Graph Extensions — mục 7.

### Nhóm B — Open Question kế thừa từ Domain/Logical Model (Round 4-7), chưa trả lời, không chặn DDL cơ bản

- Câu 18 (danh sách `relation_type` đầy đủ), câu 20 (`AssessmentResult` cardinality), câu 21 (entity log Local Expansion) — [OpenQuestions.md](../01_PRD/OpenQuestions.md).
- Cơ chế "retract" cho `Evidence`/`KnowledgeEdge` sai — [PersistenceArchitecture.md](PersistenceArchitecture.md) Open Question #2-3.
- `KnowledgeNode` nội dung có version khi sửa không — [LogicalDatabaseModel.md](LogicalDatabaseModel.md) Open Question #4.
- Đồng bộ trạng thái Archive giữa `Goal`/`Roadmap`/`LearningSession` (1 transaction kỹ thuật hay nhiều bước) — [LogicalDatabaseModel.md](LogicalDatabaseModel.md) Open Question #3.

Không câu hỏi nào ở Nhóm A hoặc B ngăn việc viết `CREATE TABLE` cho phần lớn entity — chúng ảnh hưởng **chi tiết cột/giá trị/cấu hình cụ thể**, không ảnh hưởng **việc bảng có thể được thiết kế**.

## 4. Kết luận: ✅ READY

**Có thể bắt đầu Physical Database Design.**

Lý do: Domain Architecture (Round 1-6), Persistence Architecture (Step 1), Logical Database Model (Step 2, nay READY toàn phần), và Physical Design Preparation (Step 3) đã cung cấp đủ nền tảng — entity, quan hệ, ownership, lifecycle, aggregate boundary, reference rule, chiến lược ID/audit/soft-delete/versioning (đề xuất), mô hình truy vết (`TraceLink`, đã khóa), và đánh giá hệ quản trị CSDL phù hợp (SQL Server). Không còn Risk/Open Question nào ở mức "blocking" — chỉ còn lựa chọn kỹ thuật cụ thể (Nhóm A) và chi tiết giá trị/cấu hình (Nhóm B), cả hai đều thuộc phạm vi tự nhiên của Physical Design, không phải điều kiện tiên quyết của nó.

### Giả định cần giữ nguyên khi sang Physical Database Design

(Bổ sung cho danh sách 8 giả định đã có ở [PRE_DATABASE_REVIEW.md](../03_Domain_Model/PRE_DATABASE_REVIEW.md) — không lặp lại, chỉ thêm mới từ Step 1-3)

9. **`TraceLink` là cơ chế truy vết duy nhất cho quan hệ đa hình** — Physical Design không được tự ý thêm cột FK nullable theo loại nguồn trên `AssessmentResult`/`RecommendationProposal` như 1 "tối ưu" — điều này đi ngược DECISION-038.
10. **Không có bảng nào dùng cờ `is_deleted` tổng quát** — mọi "xóa" phải là 1 trạng thái nghiệp vụ cụ thể (Anonymized/Superseded/Archived/Retired) theo mục 4 của [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md), trừ khi Founder xác nhận lại đề xuất này.
11. **ID không được sinh tuần tự lộ liễu cho định danh public-facing** — nếu hệ thống có API lộ ID ra ngoài, cần tách định danh nội bộ (tối ưu index) khỏi định danh public (không lộ thứ tự/khối lượng).

### Nếu sau này NOT READY trở lại

Tình huống duy nhất khiến đánh giá này cần xem lại: Physical Design phát hiện 1 nhu cầu kỹ thuật **không khớp được** với bất kỳ đề xuất ở Nhóm A (ví dụ: `rowversion` không đủ cho 1 pattern concurrency phức tạp hơn dự kiến) — đây là rủi ro thấp vì các đề xuất đều dựa trên tính năng SQL Server tiêu chuẩn, không phải giải pháp tùy biến rủi ro cao.

## Liên kết ngược

[PersistenceArchitecture.md](PersistenceArchitecture.md), [LogicalDatabaseModel.md](LogicalDatabaseModel.md), [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md), [PRE_DATABASE_REVIEW.md](../03_Domain_Model/PRE_DATABASE_REVIEW.md), [DECISION-038-Traceability-Model](../11_Decisions/DECISION-038-Traceability-Model.md).

**Physical Database Design (Step 4 — `CREATE TABLE`, cột, index, constraint) chưa bắt đầu trong bất kỳ tài liệu nào tới thời điểm này.**
