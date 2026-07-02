# DECISION-038 — Traceability Model: TraceLink (No Polymorphic FK as Primary Model)

- **Status:** Accepted (Locked) — closes [LogicalDatabaseModel.md](../06_Database/LogicalDatabaseModel.md) Risk #1 / Open Question #1
- **Date:** 2026-06-27 (Round 8 / Database Design Phase, Step 3)

## Context

[LogicalDatabaseModel.md](../06_Database/LogicalDatabaseModel.md) (Step 2) xác định Risk #1: `traced_to[]`/"Evidence References" (dùng bởi `RecommendationProposal` và `AssessmentResult`) là tham chiếu đa hình — có thể trỏ tới `Evidence`, `AssessmentResult`, hoặc `DiscoverySession` tùy trường hợp — và đây là **điểm duy nhất** khiến Readiness Assessment ở Step 2 là READY-WITH-1-CAVEAT thay vì READY hoàn toàn.

## Decision

**Sử dụng TraceLink** làm mô hình truy vết chính thức xuyên hệ thống cho `Recommendation`, `Assessment`, `Evidence` — đảm bảo cả 3 đều có thể truy vết được qua lại với nhau và với nguồn gốc của chúng.

**Không sử dụng Polymorphic FK làm mô hình chính** — tức là **không** để mỗi entity (`AssessmentResult`, `RecommendationProposal`...) tự mang nhiều cột FK nullable rời rạc theo từng loại nguồn, và **không** để các cột đó tự diễn giải kiểu dữ liệu nguồn dựa trên 1 cột "loại" rải rác trên nhiều bảng khác nhau.

`TraceLink` là 1 entity logic riêng, tập trung, đóng vai trò "lớp explainability" xuyên domain — không phải thuộc tính nằm rải trên từng entity nghiệp vụ.

## Reasoning

Polymorphic FK rải trên nhiều bảng nghiệp vụ là một anti-pattern quan hệ phổ biến (mỗi bảng đích cần biết về mọi loại nguồn có thể trỏ tới nó, vi phạm tách biệt domain; khó đảm bảo toàn vẹn tham chiếu bằng constraint thông thường; khó truy vấn ngược "mọi thứ trace tới X" vì phải UNION nhiều bảng). Tập trung toàn bộ quan hệ truy vết vào 1 entity riêng (`TraceLink`) giữ cho các entity nghiệp vụ (`AssessmentResult`, `RecommendationProposal`, `Evidence`) không cần biết gì về cơ chế truy vết — chúng chỉ là "đối tượng có thể được trace tới/từ", còn `TraceLink` là tầng hạ tầng độc lập thực thi Explainability First ([DECISION-027](DECISION-027-Explainability-First.md)) một cách nhất quán, dễ truy vấn ngược, và dễ mở rộng thêm loại entity mới sau này mà không cần sửa schema của entity nghiệp vụ đã có.

## Consequences

- **Đóng Risk #1 / Open Question #1** của [LogicalDatabaseModel.md](../06_Database/LogicalDatabaseModel.md) — Readiness Assessment ở đó được nâng từ READY-WITH-1-CAVEAT lên READY (cập nhật tại tài liệu đó).
- `TraceLink` không thuộc bất kỳ Core Domain nghiệp vụ nào (không phải Aggregate Root của Assessment/Evidence/Recommendation) — là hạ tầng cross-cutting thực thi Explainability First, tương tự cách Learning Session là hạ tầng điều phối (không sở hữu nghiệp vụ của domain khác).
- Chi tiết Scope/Ownership/Lifecycle của `TraceLink`: [Docs/06_Database/PhysicalDesignPreparation.md](../06_Database/PhysicalDesignPreparation.md) mục 6.
- Mọi nơi từng mô tả `traced_to[]`/"Evidence References" như 1 mảng ID tự do (DECISION-027, DECISION-030) **không đổi về ý nghĩa nghiệp vụ** — chỉ đổi cách hiện thực hóa ở tầng lưu trữ, từ "mảng ID không định kiểu" sang "tập hợp `TraceLink` có định kiểu rõ".

## Related Documents

- [DECISION-027-Explainability-First](DECISION-027-Explainability-First.md)
- [DECISION-030-Assessment-Result-Granularity](DECISION-030-Assessment-Result-Granularity.md)
- [Docs/06_Database/LogicalDatabaseModel.md](../06_Database/LogicalDatabaseModel.md)
- [Docs/06_Database/PhysicalDesignPreparation.md](../06_Database/PhysicalDesignPreparation.md)
