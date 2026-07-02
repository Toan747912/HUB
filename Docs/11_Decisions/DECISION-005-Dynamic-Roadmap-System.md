# DECISION-005 — Dynamic Roadmap System

- **Status:** Accepted (Locked)
- **Date:** 2026-06-27

## Context

Cần xác định roadmap được sinh ra một lần đầy đủ, hay mở rộng dần theo tiến trình học.

## Decision

Roadmap là **tài liệu sống**, KHÔNG được tạo chi tiết toàn bộ ngay từ đầu — mở rộng động theo nhu cầu khám phá của người học.

Ví dụ minh họa:
```
Goal
├── Backend
├── Frontend
├── AI
└── Deployment

→ mở Backend →

Backend
├── API
├── Database
├── Authentication

→ mở Authentication →

Authentication
├── Session
├── JWT
├── OAuth
```

## Reasoning

Sinh chi tiết toàn bộ ngay từ đầu giả định AI biết hết về trình độ/tiến trình tương lai của người học — điều này mâu thuẫn với nguyên tắc 4 (AI phải thích nghi). Mở rộng động cho phép mỗi lần "mở nhánh" sử dụng thông tin mới nhất về Learner.

## Consequences

- Roadmap Engine phải hỗ trợ sinh nhánh con theo yêu cầu (lazy expansion), không phải generate-all-upfront.
- Domain Model: `RoadmapNode` có trạng thái collapsed/expanded, tự tham chiếu (cây), không phải danh sách phẳng cố định.

## Related Documents

- [Docs/00_Vision/ProductVision.md](../00_Vision/ProductVision.md)
- [Docs/03_Domain_Model/DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md)
- [AI/RoadmapEngine](../../AI/RoadmapEngine/README.md)
