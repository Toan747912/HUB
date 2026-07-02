# DECISION-008 — Learning Modes

- **Status:** Accepted (Locked)
- **Date:** 2026-06-27

## Context

Cần nhiều phong cách tương tác giảng dạy khác nhau, vì không phải lúc nào người học cũng cần/muốn cùng một kiểu hướng dẫn.

## Decision

4 Learning Mode, người học chuyển đổi tự do bất kỳ lúc nào:

| Mode | Tên | Đặc điểm |
|---|---|---|
| A | Explain | AI giải thích trực tiếp |
| B | Explain + Verify | AI giải thích, sau đó kiểm tra hiểu |
| C | Socratic | AI dẫn dắt bằng câu hỏi, không giải thích trực tiếp |
| D | Mentor | AI đóng vai mentor toàn diện — kết hợp các mode khi cần |

## Reasoning

Không có một phong cách giảng dạy nào tối ưu cho mọi tình huống/người học — quyền chuyển mode tự do trực tiếp thực thi nguyên tắc 5 (user quyết định cuối cùng) ở tầng tương tác hằng ngày, không chỉ ở tầng roadmap.

## Consequences

- Prompt Architecture cần input "Learning Mode đang active" là trường bắt buộc cho hầu hết Capability giảng dạy (xem [Docs/05_Prompt_Architecture/PromptArchitecture_Draft.md](../05_Prompt_Architecture/PromptArchitecture_Draft.md)).
- Cần xác định Mode nào hỗ trợ đạt cấp độ Knowledge Philosophy nào tốt nhất — hiện là Gap 6 chưa giải quyết.
- 🔶 Đề xuất MVP: chỉ implement Mode A và C trước (2 cực đối lập), B/D là tổ hợp — xem [Docs/09_MVP/MVP_Plan.md](../09_MVP/MVP_Plan.md).

## Related Documents

- [Docs/00_Vision/ProductVision.md](../00_Vision/ProductVision.md)
- [Product/LearningModels/LearningModes.md](../../Product/LearningModels/LearningModes.md)
- [AI/TeachingEngine](../../AI/TeachingEngine/README.md)
