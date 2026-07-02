# DECISION-047 — Learning Session Transition Log (`learning_session_transition`)

- **Status:** Accepted (Locked) — closes [DDL_ROUND1_REVIEW.md](../06_Database/DDL_ROUND1_REVIEW.md) mục 2/5 (the one NEEDS_REVISION item)
- **Date:** 2026-06-27 (Database Design Phase, Step 4B Round 1 Finalization)

## Context

[DDL_ROUND1_DESIGN.md](../06_Database/DDL_ROUND1_DESIGN.md) mục 0.1 thiết kế bảng `learning_session_transition` — không nằm trong 18+1 entity gốc của [LogicalDatabaseModel.md](../06_Database/LogicalDatabaseModel.md). Lý do phát sinh: [PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md) mục 1 "khuyến nghị mạnh" 1 transition log cho `LearningSession` (audit-by-companion-log) nhưng chưa từng được tạo thành entity riêng; [DECISION-045](DECISION-045-Temporal-Strategy.md) dựa vào companion log này để kết luận `learning_session`/`sub_session` **không cần** History Table — nếu bảng không tồn tại, kết luận đó không có gì hậu thuẫn, và yêu cầu Audit ở [DatabaseBlueprint.md](../06_Database/DatabaseBlueprint.md) mục 1.17 (DECISION-033 — cần biết nguồn gốc transition Active→Paused) cũng treo lửng vì `TraceLink` chưa tới lượt triển khai. [DDL_ROUND1_REVIEW.md](../06_Database/DDL_ROUND1_REVIEW.md) gắn cờ đây là 1 cấu trúc "thêm" cần Founder/ChatGPT xác nhận trước khi vào SQL Generation, theo nguyên tắc Claude không tự quyết định cấu trúc mới.

**Founder + Lead Architect đã review và APPROVED**, với phân loại rõ: `learning_session_transition` là **Supporting Persistence Entity**, **KHÔNG** là Core Domain Entity, **KHÔNG** là Aggregate mới, **KHÔNG** là Domain mới.

## Decision

**Tạo `learning_session_transition`** làm Supporting Persistence Entity, ghi nhận lịch sử transition trạng thái của `LearningSession`.

### Purpose

Ghi nhận **mỗi lần `learning_session.state` đổi** — `from_state`, `to_state`, tác nhân kích hoạt (`learner` tự pause/resume, `recommendation_engine` khi Learner xác nhận đề xuất pause theo [DECISION-033](DECISION-033-Adaptive-Pause.md), hoặc `system` cho transition tự nhiên như roadmap complete → Completed), và thời điểm xảy ra. Mục đích duy nhất: **thực thi** yêu cầu Audit đã được Decision Log khóa từ trước ([DECISION-033](DECISION-033-Adaptive-Pause.md), [DECISION-045](DECISION-045-Temporal-Strategy.md)) — không tạo ra hành vi nghiệp vụ mới nào.

### Ownership

Write-owner: **Learning Session Domain** — cùng domain với `LearningSession`/`SubSession` (Boundary 11, [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 5). Không có domain nào khác ghi vào bảng này; mọi domain khác (Recommendation, Mentor Interaction...) chỉ là **nguồn kích hoạt** transition (phản ánh qua `transition_actor_type`), không trực tiếp viết row vào `learning_session_transition`.

### Lifecycle

**Created → (không đổi, vĩnh viễn).** Append-only — mỗi row là 1 fact lịch sử "transition X đã xảy ra tại thời điểm Y", không bao giờ sửa/xóa, nhất quán với nguyên tắc immutable-by-default đã áp dụng cho mọi entity append-only khác trong hệ thống.

### Why It Is NOT a Domain Entity

Một Domain Entity (theo nghĩa Core Domain trong [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md)) đại diện cho **1 khái niệm nghiệp vụ có ý nghĩa độc lập** mà Learner/AI tương tác trực tiếp (Goal, Roadmap, Evidence...). `learning_session_transition` **không có ý nghĩa nghiệp vụ độc lập nào** — nó không được Learner nhìn thấy như 1 "thứ" họ tương tác, không được AI capability nào tạo ra như 1 sản phẩm có chủ đích (khác với `Evidence`/`AssessmentResult`, vốn là sản phẩm trực tiếp của Capability AI). Nó tồn tại **hoàn toàn để phục vụ khả năng giải trình của 1 entity khác** (`LearningSession`) — đúng vai trò "hạ tầng cross-cutting" tương tự cách `TraceLink` không phải Core Domain ([DECISION-038](DECISION-038-Traceability-Model.md)), chỉ khác `TraceLink` là cross-cutting xuyên toàn hệ thống còn entity này là companion log **riêng cho 1 entity duy nhất** (`LearningSession`).

### Why It Is NOT an Aggregate

Một Aggregate Root cần ranh giới giao dịch riêng (đọc/ghi đồng thời, toàn vẹn nội bộ, theo [LogicalDatabaseModel.md](../06_Database/LogicalDatabaseModel.md) mục 5). `learning_session_transition` **không có invariant nội bộ nào cần bảo vệ ngoài chính nó** — mỗi row độc lập, không có "tập hợp con" nào cần nhất quán cùng nhau. Nó cũng không sở hữu bất kỳ entity con nào. Về mặt giao dịch, nó **luôn được ghi cùng** (hoặc ngay sau) giao dịch đổi `state` trên `LearningSession` — tức là phụ thuộc hoàn toàn vào vòng đời của Aggregate `LearningSession` (Boundary 11), không có vòng đời độc lập. Đây là lý do nó được phân loại "Supporting Persistence Entity", giống vai trò mà `ApprovalRecord` đóng cho `Roadmap` hoặc `ExpansionRecord` đóng cho `KnowledgeNode` — đều là con phụ trợ trong 1 Aggregate đã có, không phải Aggregate Root mới.

### Relationship to LearningSession

`learning_session_transition.learning_session_id → learning_session.learning_session_id` (FK, `ON DELETE RESTRICT`) — quan hệ 1–* (1 `LearningSession` có nhiều `learning_session_transition` qua thời gian). Về bản chất Aggregate, `learning_session_transition` nên được hiểu là **con trong cùng Aggregate `LearningSession`** (Boundary 11 mở rộng) — tương tự cách `SubSession` đã là con trong Aggregate đó — không mở thêm Boundary mới trong [LogicalDatabaseModel.md](../06_Database/LogicalDatabaseModel.md) mục 5.

## Reasoning

Quyết định này không phát sinh khái niệm nghiệp vụ mới — nó **hiện thực hóa** 1 khuyến nghị đã tồn tại từ [PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md) (Step 1, trước cả Round DDL này) và là điều kiện cần để [DECISION-045](DECISION-045-Temporal-Strategy.md) (đã khóa) có cơ sở thực thi đúng như đã viết. Phân loại "Supporting Persistence Entity, không Domain/Aggregate" giữ cho Domain Architecture (Round 1-6, đã khóa hoàn toàn) không bị mở lại — đây là quyết định ở tầng Physical Design/Persistence, đúng phạm vi Step 4B, không đụng tới CoreDomainMap.

## Consequences

- Đóng mục NEEDS_REVISION duy nhất ở [DDL_ROUND1_REVIEW.md](../06_Database/DDL_ROUND1_REVIEW.md) — Round 1 chuyển sang READY_FOR_SQL_GENERATION (xem tài liệu đó, cập nhật theo quyết định này).
- [LogicalDatabaseModel.md](../06_Database/LogicalDatabaseModel.md) cần ghi nhận `learning_session_transition` như entity logic thứ 20 (19 gốc + `TraceLink` + entity này), gắn nhãn rõ "Supporting Persistence Entity" để không bị hiểu nhầm là entity nghiệp vụ ngang hàng `Evidence`/`AssessmentResult`.
- [DatabaseBlueprint.md](../06_Database/DatabaseBlueprint.md) cần thêm 1 mục Entity Blueprint cho bảng này, đặt trong Boundary 11 (Learning Session), không tạo Boundary mới.
- Không ảnh hưởng Domain Architecture (Round 1-6) — `CoreDomainMap.md` không cần sửa, không có Domain/Aggregate Root mới nào được thêm vào danh sách đã khóa.

## Related Documents

- [DECISION-033-Adaptive-Pause](DECISION-033-Adaptive-Pause.md)
- [DECISION-038-Traceability-Model](DECISION-038-Traceability-Model.md)
- [DECISION-045-Temporal-Strategy](DECISION-045-Temporal-Strategy.md)
- [Docs/06_Database/PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md) — mục 1
- [Docs/06_Database/LogicalDatabaseModel.md](../06_Database/LogicalDatabaseModel.md)
- [Docs/06_Database/DatabaseBlueprint.md](../06_Database/DatabaseBlueprint.md)
- [Docs/06_Database/DDL_ROUND1_DESIGN.md](../06_Database/DDL_ROUND1_DESIGN.md)
- [Docs/06_Database/DDL_ROUND1_REVIEW.md](../06_Database/DDL_ROUND1_REVIEW.md)
