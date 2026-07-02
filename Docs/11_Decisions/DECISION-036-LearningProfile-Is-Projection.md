# DECISION-036 — LearningProfile is a Projection (Not a Core Domain, Not an Aggregate Root)

- **Status:** Accepted (Locked) — confirms existing CoreDomainMap modeling, closes Open Question #1 in [PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md)
- **Date:** 2026-06-27 (Round 7 / Database Design Phase, Step 2)

## Context

[CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) (từ Round 4) đã mô hình `LearningProfile` là Domain #9, "Projection, không phải Domain ghi", không có Aggregate Root. [PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md) (Round 6) đặt câu hỏi mở (#1): liệu "Memory Profile" (tên gọi khác của cùng khái niệm, từ Round 1, [DECISION-011](DECISION-011-User-Memory.md)) có ý định là 1 entity mới có write path riêng hay không, vì Database Design Phase cần câu trả lời chắc chắn trước khi xác định Aggregate Persistence Boundary.

## Decision

**`LearningProfile` chính thức là Projection** — không phải Core Domain, không phải Aggregate Root.

Xác nhận lại (không đổi) những gì đã có từ Round 4/DECISION-011:
- Không có bảng/entity lưu trữ độc lập cho `LearningProfile` mang ý nghĩa "nguồn sự thật".
- Mọi nội dung hiển thị trong `LearningProfile` được tính từ `Goal` (History), `KnowledgeNodeMastery`, `AssessmentResult`, `DiscoverySession` — không có write API riêng ghi trực tiếp vào `LearningProfile`.
- "Memory Profile" (DECISION-011) và "Learning Profile" (CoreDomainMap Round 4) là **cùng 1 khái niệm, 2 tên gọi qua các Round** — không phải 2 entity khác nhau.

## Reasoning

Cho phép `LearningProfile` có write path riêng sẽ tạo ra 1 nguồn sự thật thứ hai cho dữ liệu đã có nguồn sự thật ở domain khác (Goal/Assessment/Discovery) — vi phạm trực tiếp nguyên tắc đã thiết lập từ DECISION-011 ("view tổng hợp tính toán, không phải nguồn dữ liệu độc lập") và làm phức tạp Explainability First (2 nguồn có thể lệch nhau, không rõ nguồn nào đúng). Giữ nguyên là Projection-only giúp Logical Database Model không cần định nghĩa Aggregate Persistence Boundary cho nó — nó không có boundary riêng, chỉ có **công thức tổng hợp** từ boundary của domain khác.

## Consequences

- **Đóng Open Question #1** trong [PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md).
- [LogicalDatabaseModel.md](../06_Database/LogicalDatabaseModel.md) (Step 2) **không liệt kê `LearningProfile` trong Candidate Entities** — chỉ ghi chú nó là Read Model/Computed View, tham chiếu domain nguồn.
- Nếu sau này cần cache (`LearningProfile` materialized) vì lý do hiệu năng, cache đó phải tái tạo được hoàn toàn từ domain nguồn — không có cột nào trên cache đó được phép là nguồn sự thật duy nhất (đã nêu ở PersistenceArchitecture.md mục 3.6, nay được xác nhận chính thức bằng Decision).

## Related Documents

- [DECISION-011-User-Memory](DECISION-011-User-Memory.md)
- [Docs/03_Domain_Model/CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md)
- [Docs/06_Database/PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md)
- [Docs/06_Database/LogicalDatabaseModel.md](../06_Database/LogicalDatabaseModel.md)
