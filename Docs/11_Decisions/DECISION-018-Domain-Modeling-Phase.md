# DECISION-018 — Domain Modeling Phase

- **Status:** Accepted (Locked)
- **Date:** 2026-06-27 (Round 2)

## Context

Sau DECISION-015/016/017, Domain Model hiện tại ([DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md)) đã lạc hậu so với kiến trúc Knowledge/Evidence/Mastery mới — tiếp tục thiết kế Database/API/UI lúc này có rủi ro xây trên một mô hình domain chưa ổn định, phải sửa lại nhiều lần.

## Decision

**Tạm dừng:** Database Design, API Design, UI Design — cho tới khi Core Domain Model được hoàn thành.

**Ưu tiên hiện tại:** Domain Modeling (xem [Docs/03_Domain_Model/CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md)).

## Reasoning

Thiết kế Database/API/UI trên domain model chưa ổn định dẫn tới chi phí sửa lại cao hơn nhiều so với việc trì hoãn — đặc biệt khi DECISION-015 vừa đổi cardinality cốt lõi (RoadmapNode↔Concept) mà chưa được phản ánh đầy đủ vào Domain Model.

## Consequences

- `Docs/06_Database/`, `Docs/07_API/`, `Docs/08_UI_UX/` tiếp tục là khung rỗng — README của 3 thư mục này được cập nhật để trích dẫn quyết định này làm lý do chính thức (thay vì lý do chung "chưa ổn định" trước đây).
- `Apps/frontend`, `Apps/backend`, `Apps/ai-service`, `Apps/admin` gián tiếp bị block theo (đã vốn chưa có code).
- Điều kiện để mở khóa lại 3 mảng trên: `CoreDomainMap.md` được Founder/ChatGPT chấp thuận, và các Open Domain Question trong đó được trả lời ở mức đủ để không đổi cardinality/ownership cốt lõi thêm lần nữa.

## Related Documents

- [DECISION-014-Workspace-Architecture-Layered-Model](DECISION-014-Workspace-Architecture-Layered-Model.md)
- [Docs/03_Domain_Model/CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md)
- [Docs/06_Database/README.md](../06_Database/README.md), [Docs/07_API/README.md](../07_API/README.md), [Docs/08_UI_UX/README.md](../08_UI_UX/README.md)
