# DECISION-039 — Knowledge Graph Persistence: Relational Tables + Recursive CTE (No SQL Server Graph Extensions for v1)

- **Status:** Accepted (Locked) — closes [PhysicalDesignPreparation.md](../06_Database/PhysicalDesignPreparation.md) mục 7, Nhóm A item "Lựa chọn mô hình lưu Knowledge Graph"
- **Date:** 2026-06-27 (Database Design Phase, Step 4A — Database Blueprint)

## Context

[PhysicalDesignPreparation.md](../06_Database/PhysicalDesignPreparation.md) mục 7 (SQL Server Suitability) xác định 2 lựa chọn kỹ thuật khả dĩ cho lưu trữ `KnowledgeNode`/`KnowledgeEdge` (DAG, multi-parent, reachability check theo [DECISION-029](DECISION-029-Cycle-Detection-Strategy.md)): (a) bảng quan hệ thông thường (`from_node_id`/`to_node_id`) + Recursive CTE cho traversal, hoặc (b) SQL Server Graph Extensions (`NODE`/`EDGE` table, `MATCH` clause). Đây là điểm còn mở duy nhất ở Nhóm A của [PHYSICAL_DESIGN_READINESS.md](../06_Database/PHYSICAL_DESIGN_READINESS.md) mục 3 liên quan trực tiếp tới cách viết DDL cho `KnowledgeNode`/`KnowledgeEdge` ở Step 4.

## Decision

**Sử dụng:**
- `KnowledgeNode` — bảng quan hệ thông thường (Current State Snapshot).
- `KnowledgeEdge` — bảng quan hệ thông thường, cột `from_node_id`/`to_node_id` (append-only, immutable theo DECISION-025/029).
- Truy vấn traversal/reachability — **Recursive CTE** (`WITH ... AS (...)`).

**Không sử dụng SQL Server Graph Extensions** (`NODE`/`EDGE` table, `MATCH` clause) ở phiên bản đầu (v1).

## Reasoning

Nhất quán với triết lý "đơn giản trước, chỉ tối ưu khi có bằng chứng" đã áp dụng ở [DECISION-029](DECISION-029-Cycle-Detection-Strategy.md) (Runtime Reachability Check thay Closure Table) — không thêm tính năng SQL Server chuyên biệt, ít phổ biến hơn, khi bảng quan hệ + Recursive CTE đã đáp ứng đủ nhu cầu hiện tại (DAG, multi-parent, reachability). Bảng quan hệ thông thường cũng dễ vận hành/debug hơn với đội ngũ SQL Server truyền thống, và không khóa cứng hệ thống vào 1 tính năng chuyên biệt nếu sau này cần đổi hệ quản trị CSDL.

## Consequences

- Đóng điểm còn mở duy nhất ở Nhóm A của [PHYSICAL_DESIGN_READINESS.md](../06_Database/PHYSICAL_DESIGN_READINESS.md) mục 3 liên quan tới Knowledge Graph storage.
- `DatabaseBlueprint.md` (Step 4A) mô tả `KnowledgeNode`/`KnowledgeEdge` theo mô hình bảng quan hệ — không có Index Strategy cụ thể nào dựa trên Graph Extensions.
- Nếu sau này có bằng chứng vận hành thực tế cho thấy Recursive CTE không đủ hiệu năng ở quy mô lớn, đây là quyết định **có thể đổi lại** mà không cần sửa Domain/Logical Model — chỉ ảnh hưởng cách viết DDL/truy vấn cụ thể (tương tự ghi chú ở DECISION-029).
- Không phát sinh entity hay cột mới — quyết định này chỉ chốt cách hiện thực hóa quan hệ `KnowledgeNode`–`KnowledgeEdge` đã có ở [LogicalDatabaseModel.md](../06_Database/LogicalDatabaseModel.md).

## Related Documents

- [DECISION-025-Knowledge-Graph-DAG](DECISION-025-Knowledge-Graph-DAG.md)
- [DECISION-029-Cycle-Detection-Strategy](DECISION-029-Cycle-Detection-Strategy.md)
- [Docs/06_Database/PhysicalDesignPreparation.md](../06_Database/PhysicalDesignPreparation.md)
- [Docs/06_Database/PHYSICAL_DESIGN_READINESS.md](../06_Database/PHYSICAL_DESIGN_READINESS.md)
- [Docs/06_Database/DatabaseBlueprint.md](../06_Database/DatabaseBlueprint.md)
