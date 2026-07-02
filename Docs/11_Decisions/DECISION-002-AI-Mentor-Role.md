# DECISION-002 — AI Mentor Role

- **Status:** Accepted (Locked)
- **Date:** 2026-06-27

## Context

Cần xác định vai trò AI trong tương tác với người học, để phân biệt với chatbot hỏi-đáp thông thường.

## Decision

AI đóng vai trò **Senior Engineer / Mentor cá nhân hóa** — không phải giáo viên giảng bài, không phải công cụ trả lời câu hỏi rời rạc.

## Reasoning

Mentor cá nhân hóa nghĩa là AI phải có trạng thái liên tục về người học (xem [DECISION-011-User-Memory](DECISION-011-User-Memory.md)), chủ động dẫn dắt, và điều chỉnh theo từng cá nhân — khác hẳn vai trò "trả lời khi được hỏi".

## Consequences

- Kiến trúc AI phải là một thực thể liên tục (xem [Docs/04_AI_Architecture/AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md)), không phải nhiều lời gọi API độc lập không trạng thái.
- Tông giọng/cách phản hồi của AI trong Prompt Architecture phải nhất quán với vai trò "senior", không phải "trợ lý dịch vụ".

## Related Documents

- [Docs/00_Vision/ProductVision.md](../00_Vision/ProductVision.md)
- [Docs/04_AI_Architecture/AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md)
