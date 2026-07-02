# DECISION-017 — Mastery Framework

- **Status:** Accepted (Locked) — elaborates [DECISION-009](DECISION-009-Knowledge-Philosophy.md), does not replace the 4-level framework
- **Date:** 2026-06-27 (Round 2)

## Context

DECISION-009 khóa 4 cấp độ Remember/Explain/Apply/Teach nhưng coi mỗi cấp độ là một đơn vị đo phẳng. Khi cụ thể hóa cấp độ Teach để có thể đánh giá được, nó tỏ ra không phải một hành động đơn lẻ.

## Decision

Hệ thống tiếp tục dùng Mastery Framework 4 cấp độ: **Remember, Explain, Apply, Teach** (không đổi).

**Teach không phải một hành động đơn lẻ.** Teach là một **Capability Cluster** gồm:

1. Explain (giải thích lại cho người khác — khác bối cảnh với "Explain" ở Level 2, xem ghi chú rủi ro dưới)
2. Simplify (đơn giản hóa khái niệm cho người mới)
3. Guide (dẫn dắt người khác tự giải quyết, không làm hộ)
4. Review (đánh giá/phản biện được giải pháp của người khác)
5. Transfer Knowledge (áp dụng/diễn giải khái niệm sang bối cảnh mới)

Mỗi cấp độ (Remember/Explain/Apply/Teach) có thể được đánh giá bằng **nhiều loại evidence khác nhau** — không có 1 loại bài kiểm tra cố định cho mỗi cấp độ.

## Reasoning

"Dạy lại được" trong thực tế là tổ hợp nhiều kỹ năng nhỏ — một Learner có thể giải thích tốt (Explain sub-capability) nhưng chưa Guide tốt (chỉ làm hộ thay vì dẫn dắt). Coi Teach là 1 trạng thái boolean sẽ làm mất thông tin hữu ích này, vi phạm tinh thần "đo được" mà DECISION-009 đã đặt ra.

## ⚠️ Rủi ro kiến trúc cần lưu ý

Tên "**Explain**" được dùng ở **2 lớp khác nhau**:
- Explain — **Level 2** của Mastery Framework (Learner giải thích lại cho chính AI/hệ thống để xác nhận hiểu).
- Explain — **sub-capability của Teach** (Learner giải thích cho *người khác*, ở mức độ phức tạp cao hơn).

Đây không phải lỗi sai, nhưng là một sự trùng tên có thể gây nhầm lẫn khi implement (field name, prompt, UI). Đã ghi nhận là rủi ro kiến trúc, cần Founder/ChatGPT xác nhận cách đặt tên phân biệt 2 khái niệm này trước khi vào Database Design.

## Consequences

- Đánh giá Teach cần track riêng trạng thái của 5 sub-capability, không chỉ 1 trạng thái Teach tổng — ảnh hưởng `MasteryModel` (xem [AI/KnowledgeEngine/MasteryModel.md](../../AI/KnowledgeEngine/MasteryModel.md)).
- Gap 5 (công thức Mastery Score) giờ phức tạp hơn: cần quyết định Teach = đạt đủ N/5 sub-capability hay tất cả 5 — vẫn 🔶 OPEN.

## Related Documents

- [DECISION-009-Knowledge-Philosophy](DECISION-009-Knowledge-Philosophy.md)
- [DECISION-016-Evidence-Based-Decay](DECISION-016-Evidence-Based-Decay.md)
- [AI/KnowledgeEngine/MasteryModel.md](../../AI/KnowledgeEngine/MasteryModel.md)
- [Docs/01_PRD/RequirementGaps.md](../01_PRD/RequirementGaps.md) — Gap 5
