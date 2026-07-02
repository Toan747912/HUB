# DECISION-001 — Project Identity & Positioning

- **Status:** Accepted (Locked)
- **Date:** 2026-06-27

## Context

Founder khởi tạo dự án mới, cần định vị rõ ràng để tránh sản phẩm trôi dạt thành một trong các mô hình quen thuộc nhưng không phải mục tiêu thật (LMS, course platform, ChatGPT wrapper).

## Decision

- Tên dự án: **AI Mentor OS**.
- Định vị: **AI Apprenticeship Platform**.
- Sản phẩm KHÔNG phải: LMS, nền tảng khóa học, FreeCodeCamp clone, ChatGPT wrapper.
- Mục tiêu sản phẩm (3 phần, phải đạt đồng thời): (a) người học hoàn thành mục tiêu thực tế, (b) thực sự hiểu kiến thức, (c) có thể tự xây sản phẩm tương tự mà không phụ thuộc AI.

## Reasoning

Một sản phẩm chỉ đạt (a) là "code generator". Đạt (a)+(b) nhưng không đạt (c) là "gia sư giỏi nhưng làm người học lệ thuộc mãi". Việc định vị rõ ngay từ đầu giúp mọi quyết định thiết kế sau có một tiêu chí loại trừ rõ ràng.

## Consequences

- Mọi feature đề xuất sau này phải kiểm tra: nó phục vụ cho (a), (b), hay (c)? Nếu không phục vụ gì, cần cân nhắc lại có nên thuộc sản phẩm này không.
- Không build các pattern UX/feature điển hình của LMS (lớp học, điểm danh, chứng chỉ hàng loạt) mà không có lý do gắn với apprenticeship.

## Related Documents

- [Docs/00_Vision/ProductVision.md](../00_Vision/ProductVision.md)
- [Docs/11_Decisions/DECISION-002-AI-Mentor-Role.md](DECISION-002-AI-Mentor-Role.md)
