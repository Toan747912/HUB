# DECISION-035 — No Full Event Sourcing (Append-only + Current State Snapshot)

- **Status:** Accepted (Locked) — formalizes the pattern already implied in [PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md)
- **Date:** 2026-06-27 (Round 7 / Database Design Phase, Step 2)

## Context

[PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md) mục 2 đã quan sát: "Không có domain nào dùng Event Sourcing đầy đủ (replay toàn bộ event để dựng state)" — nhưng đây là một quan sát/đề xuất của Claude, chưa phải quyết định chính thức được khóa. Cần chốt rõ để Logical Database Model (Step 2) không vô tình thiết kế theo 2 hướng khác nhau cho các entity tương tự nhau.

## Decision

**Không sử dụng Full Event Sourcing** (không có cơ chế "replay toàn bộ event log để dựng lại current state" cho bất kỳ entity nào trong hệ thống).

Persistence Strategy chính thức:
- **Append-only Evidence** — `Evidence`/`EvidenceLink` chỉ ghi thêm, không bao giờ replay để tính ra state khác.
- **Append-only Assessment History** — `AssessmentResult` chỉ ghi thêm, là lịch sử đầy đủ, không bị replay.
- **Current State Snapshot** — `KnowledgeNodeMastery` (và các entity "current state" tương tự khác như `LearningSession.state`) được **ghi trực tiếp song song** mỗi khi có sự kiện liên quan xảy ra (ví dụ mỗi `AssessmentResult` mới), không được tính lại bằng cách replay toàn bộ lịch sử mỗi lần đọc.

## Reasoning

Event Sourcing đầy đủ (replay-based) tăng độ phức tạp đáng kể (cần snapshot định kỳ để tránh replay quá dài, cần cơ chế versioning event schema) mà hệ thống hiện tại không có nhu cầu thực sự — không có yêu cầu nào trong Decision Log cần "quay lại trạng thái ở quá khứ bằng cách replay" (Explainability First chỉ cần *tham chiếu* tới Evidence/AssessmentResult cụ thể, không cần *tái tạo* state cũ bằng cách replay). Append-only log (cho mục đích audit/explainability) + Snapshot ghi trực tiếp (cho mục đích đọc nhanh) đạt được cả 2 mục tiêu mà không cần độ phức tạp của Event Sourcing kinh điển.

## Consequences

- `KnowledgeNodeMastery` là **write target trực tiếp** của Assessment Domain mỗi khi xử lý 1 `AssessmentResult` mới — không có "projection rebuild" job để tính lại từ đầu trong vận hành bình thường (có thể cần 1 lần duy nhất nếu phát hiện lỗi dữ liệu, nhưng đó là vận hành khắc phục sự cố, không phải cơ chế thiết kế).
- Tương tự cho `LearningSession.state`, `RecommendationProposal` trạng thái xử lý — đều là Snapshot ghi trực tiếp, có companion log để audit (theo PersistenceArchitecture.md mục 2).
- [LogicalDatabaseModel.md](../06_Database/LogicalDatabaseModel.md) (Step 2) sẽ áp dụng nhất quán: mỗi entity chỉ thuộc 1 trong 2 nhóm — **Append-only Log** hoặc **Current State Snapshot** (không entity nào được mô hình là "event-sourced, replay-based").
- Không cần thiết kế event schema versioning ở vòng Database Design này.

## Related Documents

- [Docs/06_Database/PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md)
- [DECISION-026-Assessment-Core-Domain](DECISION-026-Assessment-Core-Domain.md)
- [DECISION-027-Explainability-First](DECISION-027-Explainability-First.md)
- [Docs/06_Database/LogicalDatabaseModel.md](../06_Database/LogicalDatabaseModel.md)
