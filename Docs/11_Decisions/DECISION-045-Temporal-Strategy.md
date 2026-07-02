# DECISION-045 — Temporal Strategy: Trigger-Maintained History Tables, Only Where No Companion Log Exists

- **Status:** Accepted (Locked) — closes [SupabaseCompatibilityReview.md](../06_Database/SupabaseCompatibilityReview.md) mục 1.1 (Medium impact), supersedes SQL Server Temporal Tables proposal in [PhysicalDesignPreparation.md](../06_Database/PhysicalDesignPreparation.md) mục 3/7 và Temporal Table Naming ở [DatabaseNamingConvention.md](../06_Database/DatabaseNamingConvention.md) mục 9
- **Date:** 2026-06-27 (Database Design Phase, Pre-DDL Platform Alignment)

## Context

[PhysicalDesignPreparation.md](../06_Database/PhysicalDesignPreparation.md) mục 3/7 đề xuất SQL Server System-Versioned Temporal Tables cho toàn bộ entity Current State Snapshot — không có tính năng tương đương native trong PostgreSQL/Supabase. Tài liệu gốc đã tự dự đoán phương án dự phòng: *"giữ cách trung lập hệ quản trị (audit log tự viết ở Application Layer)"*. Cần chọn cụ thể cơ chế đó.

## Decision

**Dùng History Table trigger-maintained — nhưng chỉ áp dụng cho entity KHÔNG có companion append-only log đã chốt sẵn** (tránh trùng lặp 2 nguồn sự thật, nguyên tắc đã có từ [PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md) mục 2 quyết định #2).

### Đánh giá 3 phương án

| Phương án | Mô tả | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **(1) — Được chọn: History Tables (trigger-maintained, per-table, schema `history`)** | 1 bảng lịch sử riêng cho mỗi bảng chính cần lịch sử, schema `history` (giữ nguyên thiết kế schema 2 tầng đã chốt ở Naming Convention), 1 trigger `AFTER UPDATE`/`AFTER DELETE` ghi row cũ vào `history.<table_name>` trước khi thay đổi | Giữ đúng cấu trúc cột của bảng chính (dễ query lịch sử của riêng 1 entity, dễ hiểu); tách biệt rõ theo entity, không lẫn lộn lịch sử nhiều loại entity trong 1 bảng; gần nhất với hành vi Temporal Tables gốc (chỉ khác cơ chế duy trì) — ít phải diễn giải lại tài liệu đã viết | Cần 1 bảng + 1 trigger / entity áp dụng — chi phí lặp lại, nhưng giảm được bằng 1 trigger function generic tham số hóa tên bảng |
| **(2) — Không chọn: 1 Audit Table chung cho toàn hệ thống** (`audit_log` với cột `table_name`, `record_id`, `changed_data jsonb`, `changed_at`...) | 1 bảng duy nhất ghi nhận mọi thay đổi trên mọi bảng, dữ liệu cũ lưu dạng `jsonb` | Chỉ cần 1 bảng + 1 trigger function cho toàn hệ thống — triển khai nhanh, phù hợp mục đích compliance/audit tổng quát | Mất type-safety (mọi giá trị nén vào `jsonb`, khó truy vấn có cấu trúc — ví dụ "lịch sử đổi `mastery` của 1 Learner cụ thể" cần parse JSON thay vì SELECT cột thường); trộn lịch sử của nhiều entity khác bản chất vào 1 nơi — đi ngược tinh thần "mỗi entity logic độc lập" đã xuyên suốt Domain/Logical Model; phù hợp hơn cho mục đích compliance toàn hệ thống (ai sửa gì, khi nào) hơn là phục vụ truy vấn nghiệp vụ lịch sử cụ thể |
| **(3) — Không chọn: Event-based history toàn diện** (mọi thay đổi state đều phải có 1 "domain event" tương ứng, không dùng history table nào) | Nhất quán hoàn toàn với mô hình Event, không cần cơ chế audit riêng | **Mâu thuẫn trực tiếp với [DECISION-035](DECISION-035-No-Full-Event-Sourcing.md)** ("Không có domain nào dùng Event Sourcing đầy đủ") — áp dụng (3) cho mọi entity Snapshot tương đương việc retrofit Event Sourcing toàn diện cho cả những entity chưa từng có khái niệm "event" trong Domain Architecture (`Learner`, `DiscoverySession`, `MentorSession`) — đây là thay đổi tầng Domain Architecture, vượt quá phạm vi 1 quyết định kỹ thuật về temporal/audit |

**Kết luận đánh giá:** (3) bị loại ngay vì mâu thuẫn trực tiếp với quyết định Domain Architecture đã khóa (DECISION-035), không phải lựa chọn hợp lệ ở tầng Physical Design. Giữa (1) và (2), (1) phù hợp hơn vì hệ thống đã có rất nhiều entity dùng companion-log riêng (xem mục Khuyến nghị) — (2) chỉ thực sự có lợi nếu **không có** cơ chế audit-by-companion-log nào tồn tại, nhưng thực tế ngược lại.

## Khuyến nghị cuối cùng (Final Recommendation)

**Không áp dụng History Table cho mọi entity Snapshot một cách đồng nhất — chỉ áp dụng đúng nơi không có companion log:**

| Nhóm | Entity | Cơ chế lịch sử |
|---|---|---|
| **Có companion append-only log sẵn — KHÔNG cần History Table mới** | `roadmap`/`roadmap_node` (qua `approval_record`); `knowledge_node_mastery` (qua `assessment_result`); `learning_session`/`sub_session` (qua transition log khuyến nghị, [PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md) mục 1) | Giữ nguyên — thêm History Table ở đây là **trùng lặp 2 nguồn sự thật**, vi phạm trực tiếp nguyên tắc đã chốt ở [PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md) mục 2 |
| **Không có companion log — CẦN History Table (trigger-maintained, schema `history`)** | `learner` (sửa thông tin định danh); `knowledge_node` (nếu xác nhận cho sửa nội dung — vẫn 🔶 Open Question #4 kế thừa); `discovery_session`; `mentor_session` | Trigger `AFTER UPDATE` ghi row cũ vào `history.<table_name>` — 1 trigger function generic, viết 1 lần |
| **Append-only (immutable)** | `evidence`, `evidence_link`, `assessment_result`, `knowledge_edge`, `expansion_record`, `approval_record`, `self_assessment_mismatch`, `trace_link`, `goal`, `recommendation_proposal` | Không áp dụng — append-only đã tự là lịch sử đầy đủ (nguyên trạng, không đổi) |

**Schema/naming giữ nguyên cấu trúc đã chốt ở [DatabaseNamingConvention.md](../06_Database/DatabaseNamingConvention.md) mục 9** (schema `history`, cùng tên bảng) — chỉ đổi *cơ chế duy trì* (trigger tự viết thay vì engine tự động), và **thu hẹp phạm vi áp dụng** (4 bảng thay vì 9 bảng như đề xuất ban đầu, theo bảng trên) — bảng History Table do đó **ít hơn dự kiến cũ**, không nhiều hơn.

## Consequences

- [DatabaseNamingConvention.md](../06_Database/DatabaseNamingConvention.md) mục 9 cần cập nhật: cơ chế đổi từ "System-Versioned Temporal Tables" thành "trigger-maintained history table", và **danh sách entity áp dụng thu hẹp lại** theo bảng trên (loại `roadmap`, `roadmap_node`, `knowledge_node_mastery`, `learning_session`, `sub_session` ra khỏi nhóm cần History Table, vì đã có companion log).
- [DatabaseBlueprint.md](../06_Database/DatabaseBlueprint.md) mục 1 (Temporal Requirement của từng entity) cần cập nhật theo đúng phân nhóm mới — đây là điều chỉnh tài liệu, không đổi entity/quan hệ.
- Đóng phần Temporal Strategy của điểm ảnh hưởng Medium ở [SupabaseCompatibilityReview.md](../06_Database/SupabaseCompatibilityReview.md) mục 1.1/3.4.
- Không ảnh hưởng Domain/Logical Model — chỉ ảnh hưởng cơ chế và phạm vi triển khai audit/lịch sử ở tầng vật lý.

## Related Documents

- [DECISION-035-No-Full-Event-Sourcing](DECISION-035-No-Full-Event-Sourcing.md)
- [PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md) — mục 2, mục 4
- [PhysicalDesignPreparation.md](../06_Database/PhysicalDesignPreparation.md) — mục 3
- [DatabaseNamingConvention.md](../06_Database/DatabaseNamingConvention.md) — mục 9
- [SupabaseCompatibilityReview.md](../06_Database/SupabaseCompatibilityReview.md)
- [PLATFORM_ALIGNMENT_REVIEW.md](../06_Database/PLATFORM_ALIGNMENT_REVIEW.md)
