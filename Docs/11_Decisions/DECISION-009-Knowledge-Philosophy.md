# DECISION-009 — Knowledge Philosophy

- **Status:** Accepted (Locked)
- **Date:** 2026-06-27

## Context

Cần định nghĩa "hiểu" theo cách đo được, không chỉ là cảm giác chủ quan — để thực thi nguyên tắc 2 (hiểu quan trọng hơn hoàn thành).

## Decision

Hoàn thành task KHÔNG có nghĩa là hiểu. Hệ thống đo 4 cấp độ trên từng concept:

| Cấp độ | Ý nghĩa |
|---|---|
| Remember | Nhớ được khái niệm/cú pháp |
| Explain | Giải thích lại được bằng lời của mình |
| Apply | Áp dụng được vào tình huống thực tế |
| Teach | Dạy lại được cho người khác / bảo vệ được lựa chọn thiết kế |

Một concept chỉ **mastered** khi đạt đủ các cấp độ phù hợp với mục tiêu học (không phải concept nào cũng cần đạt Teach).

## Reasoning

4 cấp độ tạo ra một "thước đo hiểu" cụ thể, kiểm tra được, thay thế cho proxy sai lầm phổ biến "test pass = hiểu". Việc không yêu cầu mọi concept đạt Teach tránh lạm dụng đo lường vượt quá nhu cầu thực tế của Goal.

## Consequences

- Mọi Capability đánh giá (Understanding Verification) phải trả về kết quả gắn với 1 trong 4 cấp độ cụ thể, không phải điểm số mơ hồ.
- 🔶 4 cấp độ khớp tự nhiên với lập trình nhưng cần Assessment Mapping riêng cho từng lĩnh vực phi kỹ thuật — xem Gap 2 trong [Docs/01_PRD/RequirementGaps.md](../01_PRD/RequirementGaps.md).

## Related Documents

- [Product/LearningModels/KnowledgePhilosophy.md](../../Product/LearningModels/KnowledgePhilosophy.md)
- [DECISION-010-Knowledge-Graph.md](DECISION-010-Knowledge-Graph.md)
- [Docs/01_PRD/RequirementGaps.md](../01_PRD/RequirementGaps.md) — Gap 2
