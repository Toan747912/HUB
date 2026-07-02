# DECISION-014 — Workspace Architecture: Layered Model

- **Status:** Accepted (Locked)
- **Date:** 2026-06-27

## Context

Workspace ban đầu (DECISION-001..013) dùng cấu trúc phẳng (`01-vision/`, `02-requirements/`... ở root). Founder đánh giá mô hình này không đủ khả năng mở rộng cho một sản phẩm AI quy mô lớn, phát triển nhiều năm, với nhiều AI Agent (Claude, ChatGPT, agent thực thi code) cùng tham gia.

## Decision

Tái cấu trúc workspace theo mô hình phân tầng:

```
AI_Mentor_OS/ (= root thư mục HUB hiện tại)
├── Docs/            — tài liệu sản phẩm/kiến trúc/quyết định
├── Product/         — mô hình sản phẩm vận hành (Goals, Roadmaps, LearningModels...)
├── AI/              — spec từng AI Engine (Discovery/Roadmap/Teaching/Assessment/Knowledge/Recommendation)
├── Apps/            — mã nguồn ứng dụng (frontend/backend/ai-service/admin) — chưa có code
├── Infrastructure/  — hạ tầng triển khai/vận hành — chưa có nội dung
├── Research/        — đối thủ, thực nghiệm, tài liệu tham khảo, ý tưởng
└── Archive/         — tài liệu/quyết định cũ không còn là nguồn sự thật
```

Decision Log chuyển từ 1 file duy nhất sang nhiều file atomic trong `Docs/11_Decisions/`, mỗi quyết định kiến trúc có 1 file riêng theo template Title/Status/Context/Decision/Reasoning/Consequences/Related Documents.

`Docs/Project_Index.md` là điểm vào bắt buộc cho mọi AI Agent mới tham gia dự án.

## Reasoning

- **Tách biệt rõ 4 loại nội dung khác nhau** (tài liệu, mô hình sản phẩm, spec AI, mã nguồn) để mỗi loại có vòng đời và đối tượng đọc khác nhau — tránh tài liệu "lẫn" vào code, hoặc spec AI "lẫn" vào tài liệu chiến lược.
- **Decision Log atomic** giúp truy vết từng quyết định độc lập, hỗ trợ "mở khóa" một quyết định cụ thể mà không phải sửa một file khổng lồ — quan trọng khi dự án có vòng đời nhiều năm.
- **Project_Index.md** là cơ chế onboarding bắt buộc cho nhiều AI Agent — không có điểm vào chung, mỗi Agent (Claude, ChatGPT, agent code) có thể có hiểu khác nhau về trạng thái dự án.

## Consequences

- Toàn bộ nội dung đã viết trước đó (Vision, PRD, RequirementGaps, OpenQuestions, DomainModel, AIArchitecture, PromptArchitecture, MVP_Plan, Backlog, GOVERNANCE) được di chuyển vào vị trí mới tương ứng trong `Docs/`, không thay đổi nội dung quyết định sản phẩm.
- File `DECISIONS_LOG.md` gốc được giữ lại trong `Archive/` làm tham khảo lịch sử, không còn là nguồn sự thật.
- Mọi tài liệu tham chiếu đường dẫn cũ (`01-vision/`, `02-requirements/`...) đã được cập nhật sang đường dẫn mới.
- Các thư mục `Product/`, `AI/`, `Apps/`, `Infrastructure/`, `Research/` hiện đa số là khung rỗng (scaffold) — sẽ có nội dung khi dự án tiến tới các giai đoạn tương ứng (xem README.md trong từng thư mục).

## Related Documents

- [Docs/Project_Index.md](../Project_Index.md)
- [Docs/GOVERNANCE.md](../GOVERNANCE.md)
- [Archive/2026-06-27_DECISIONS_LOG_monolithic_superseded.md](../../Archive/2026-06-27_DECISIONS_LOG_monolithic_superseded.md)
