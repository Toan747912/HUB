# DECISION-006 — Roadmap Governance

- **Status:** Accepted (Locked)
- **Date:** 2026-06-27

## Context

AI có khả năng tự sinh/sửa cấu trúc roadmap — cần ranh giới rõ giữa quyền AI và quyền người học để tuân thủ nguyên tắc 5 (User luôn quyết định cuối cùng).

## Decision

| AI được phép | AI KHÔNG được phép |
|---|---|
| Đề xuất module/thứ tự mới | Tự thêm module |
| Cảnh báo rủi ro lựa chọn | Tự bỏ module |
| Phản biện quyết định của user | Tự đổi thứ tự |
| | Tự sửa roadmap |

Mọi thay đổi cấu trúc roadmap phải được **user (Learner) phê duyệt** trước khi áp dụng.

🔶 OPEN — xác nhận "user" ở đây là Learner cuối, không phải Founder (xem [Docs/01_PRD/OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 4).

## Reasoning

Roadmap Governance là cơ chế thực thi cụ thể của nguyên tắc 5. Nếu không có ranh giới rõ, "AI thích nghi" (nguyên tắc 4) có thể bị diễn giải rộng tới mức AI tự sửa roadmap mà không hỏi — phá vỡ niềm tin của người học vào tính minh bạch của hệ thống.

## Consequences

- Domain Model cần một entity ghi nhận phê duyệt (`ApprovalRecord`) gắn với mọi thay đổi cấu trúc RoadmapNode.
- Cần phân lớp rõ "Roadmap Structure" (cần phê duyệt) vs "Learning Parameters" (độ khó/tốc độ — AI tự điều chỉnh) — hiện là Gap 1 chưa giải quyết, xem [Docs/01_PRD/RequirementGaps.md](../01_PRD/RequirementGaps.md).

## Related Documents

- [Docs/03_Domain_Model/DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md) — entity `ApprovalRecord`
- [Docs/04_AI_Architecture/AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md) — Human Control Boundaries
- [Docs/01_PRD/RequirementGaps.md](../01_PRD/RequirementGaps.md) — Gap 1
