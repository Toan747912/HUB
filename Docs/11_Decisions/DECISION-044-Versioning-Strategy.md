# DECISION-044 — Versioning Strategy: `version_number` (Trigger-Incremented Integer, not `rowversion`-equivalent or `updated_at`-only)

- **Status:** Accepted (Locked) — closes [SupabaseCompatibilityReview.md](../06_Database/SupabaseCompatibilityReview.md) mục 1.2 (Medium impact), supersedes Versioning Strategy in [PhysicalDesignPreparation.md](../06_Database/PhysicalDesignPreparation.md) mục 5 và `RowVersion` naming ở [DatabaseNamingConvention.md](../06_Database/DatabaseNamingConvention.md) mục 11
- **Date:** 2026-06-27 (Database Design Phase, Pre-DDL Platform Alignment)

## Context

[PhysicalDesignPreparation.md](../06_Database/PhysicalDesignPreparation.md) mục 5 đề xuất dùng kiểu dữ liệu native SQL Server `rowversion` cho optimistic concurrency — không tồn tại trong PostgreSQL. Cần chọn lại cơ chế, áp dụng tối thiểu cho `KnowledgeNodeMastery` (rủi ro ghi đồng thời cao nhất, [PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md) Risk #1), tùy chọn cho `Learner`.

## Decision

**Dùng cột `version_number` (kiểu `bigint`, không nullable, mặc định `1`, tăng bằng trigger `BEFORE UPDATE`)** cho mọi entity Current State Snapshot có rủi ro ghi đồng thời.

### Đánh giá 3 phương án

| Phương án | Mô tả | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **(1) `rowversion` equivalent** — dùng cột hệ thống ẩn `xmin` của PostgreSQL (transaction ID ghi đè gần nhất) thay cho `rowversion` | Không cần thêm cột, không cần trigger — `xmin` có sẵn trên mọi row | `xmin` **không ổn định lâu dài**: bị PostgreSQL tái sử dụng sau `VACUUM FREEZE`/transaction ID wraparound — vi phạm trực tiếp yêu cầu của optimistic concurrency (token phải duy nhất/tăng dần vĩnh viễn); **không lộ ra qua PostgREST** theo cách dễ dùng (cần cấu hình đặc biệt để SELECT được `xmin` qua API); đây là cơ chế nội bộ của engine, không phải concurrency token được thiết kế cho mục đích này — dùng sai mục đích là rủi ro kỹ thuật, không phải "tương đương" thực sự |
| **(2) — Được chọn: `version_number` (bigint, trigger-incremented)** | Cột tường minh, tăng 1 mỗi lần `UPDATE` qua 1 trigger `BEFORE UPDATE` dùng lại được cho nhiều bảng (`NEW.version_number := OLD.version_number + 1`) | Ổn định vĩnh viễn (không bị engine tái sử dụng); lộ ra tự nhiên qua PostgREST như 1 cột thường; Application Layer đọc giá trị, gửi lại khi `UPDATE`, so sánh `WHERE version_number = :expected` — đúng pattern optimistic concurrency kinh điển, không phụ thuộc tính năng riêng của bất kỳ engine nào (portable nếu sau này đổi hệ quản trị) | Cần 1 cột thêm + 1 trigger cho mỗi bảng áp dụng (chi phí thấp, viết 1 lần dùng lại được) |
| **(3) `updated_at` only** — chỉ dựa vào cột timestamp đã có sẵn (Audit Strategy, [DatabaseNamingConvention.md](../06_Database/DatabaseNamingConvention.md) mục 10), so sánh `WHERE updated_at = :expected` khi `UPDATE` | Không cần thêm cột mới — tái dùng `updated_at` đã có | **Rủi ro clock-skew và độ phân giải timestamp**: 2 `UPDATE` xảy ra trong cùng 1 khoảng độ phân giải (hiếm nhưng không loại trừ, đặc biệt nếu nhiều `AssessmentResult` cùng lúc kích hoạt cập nhật `KnowledgeNodeMastery` gần như đồng thời — chính kịch bản rủi ro đã xác định ở PersistenceArchitecture.md Risk #1) có thể có `updated_at` giống nhau, làm mất khả năng phát hiện ghi đè; trộn lẫn 2 mục đích khác nhau (audit "khi nào sửa" vs concurrency "có ai sửa trước tôi chưa") vào 1 cột — vi phạm nguyên tắc tách biệt mục đích đã áp dụng xuyên Database Design Phase (ví dụ Audit tách khỏi Versioning ngay từ đầu ở [PhysicalDesignPreparation.md](../06_Database/PhysicalDesignPreparation.md) mục 3 vs mục 5) |

**Kết luận đánh giá:** (1) bị loại vì dùng sai mục đích 1 cơ chế nội bộ của engine cho 1 nhu cầu nó không được thiết kế để đáp ứng ổn định. (3) bị loại vì đúng kịch bản rủi ro đã biết (ghi đồng thời gần như tức thời) là chính xác trường hợp `updated_at` dễ thất bại nhất. (2) là phương án duy nhất vừa ổn định, vừa minh bạch, vừa không phụ thuộc engine cụ thể.

## Khuyến nghị cuối cùng (Final Recommendation)

- **Tên cột:** `version_number` (không dùng `row_version` — tránh ngụ ý "tương đương `rowversion`" của SQL Server, vì bản chất khác hẳn: đây là số nguyên nghiệp vụ do trigger quản lý, không phải giá trị nhị phân do engine tự sinh).
- **Kiểu dữ liệu:** `bigint`, `NOT NULL`, `DEFAULT 1`.
- **Cơ chế:** 1 trigger function `BEFORE UPDATE` dùng chung, gắn vào từng bảng cần áp dụng — *không thiết kế cụ thể trigger ở tài liệu này (ngoài phạm vi, không phải SQL)*.
- **Áp dụng cho:** `knowledge_node_mastery` (bắt buộc, rủi ro đã xác định rõ nhất) — `learner` (tùy chọn, không có hại nếu áp dụng đồng nhất, theo [PhysicalDesignPreparation.md](../06_Database/PhysicalDesignPreparation.md) mục 5 nguyên trạng).
- **Không áp dụng cho** entity append-only (immutable) — không có khái niệm ghi đè cạnh tranh trên 1 row không đổi.
- **Không áp dụng cho** `roadmap`/`roadmap_node` — tiếp tục bảo vệ qua cổng `ApprovalRecord` (nguyên trạng, không đổi).

## Consequences

- [DatabaseNamingConvention.md](../06_Database/DatabaseNamingConvention.md) mục 11 cần đổi tên cột đề xuất từ `RowVersion`/`rowversion` thành `version_number` (snake_case theo [DECISION-042](DECISION-042-Database-Naming-Convention-Alignment.md)).
- [DatabaseBlueprint.md](../06_Database/DatabaseBlueprint.md) mục 1.11 (`KnowledgeNodeMastery`) cần cập nhật cột Versioning: "cần concurrency token (`version_number`, trigger-incremented)" thay cho "đề xuất `rowversion`".
- Đóng phần Versioning Strategy của điểm ảnh hưởng Medium ở [SupabaseCompatibilityReview.md](../06_Database/SupabaseCompatibilityReview.md) mục 1.2/3.4.
- Không ảnh hưởng Domain/Logical Model — chỉ ảnh hưởng cơ chế kỹ thuật của 1-2 bảng.

## Related Documents

- [PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md) — Risk #1
- [PhysicalDesignPreparation.md](../06_Database/PhysicalDesignPreparation.md) — mục 5
- [DatabaseNamingConvention.md](../06_Database/DatabaseNamingConvention.md) — mục 11
- [SupabaseCompatibilityReview.md](../06_Database/SupabaseCompatibilityReview.md)
- [PLATFORM_ALIGNMENT_REVIEW.md](../06_Database/PLATFORM_ALIGNMENT_REVIEW.md)
