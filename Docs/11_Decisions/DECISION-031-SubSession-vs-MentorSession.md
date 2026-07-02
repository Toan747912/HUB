# DECISION-031 — SubSession and MentorSession are Distinct Entities

- **Status:** Accepted (Locked) — resolves Open Question #22, refines [DECISION-028](DECISION-028-Learning-Session-Domain.md)
- **Date:** 2026-06-27 (Round 6 / Pre-Database Review)

## Context

[DECISION-028](DECISION-028-Learning-Session-Domain.md) (Round 5) đưa `SubSession` vào như một lát cắt nhỏ hơn của `LearningSession`, nhưng để mở câu hỏi liệu nó có trùng với `MentorSession` (Mentor Interaction Domain, có từ Round 1) hay không — xem [LearningSessionDomain.md](../03_Domain_Model/LearningSessionDomain.md) Open Questions #1 và [OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 22.

## Decision

**`SubSession` và `MentorSession` là hai thực thể khác nhau**, theo hierarchy 3 tầng:

```
LearningSession
└── SubSession
    └── MentorSession
```

- `LearningSession` — 1 per Learner×Goal đang active (DECISION-028).
- `SubSession` — con trong cùng Aggregate `LearningSession`, gắn với 1 phạm vi cụ thể (1 RoadmapNode/KnowledgeNode đang được xử lý). 1 `LearningSession` có nhiều `SubSession` (tuần tự theo thời gian, hoặc nhiều khi quay lại 1 phạm vi đã học trước đó).
- `MentorSession` — vẫn là 1 lượt tương tác Mentor AI ↔ Learner (định nghĩa giữ nguyên từ Round 1, [DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md)). 1 `SubSession` chứa nhiều `MentorSession`.

## Reasoning

Gộp `SubSession` và `MentorSession` thành 1 khái niệm sẽ làm mất phân biệt giữa "phạm vi nội dung đang học" (ổn định trong một khoảng thời gian, có thể kéo dài qua nhiều lượt tương tác) và "1 lượt tương tác cụ thể" (ngắn, có thể đổi Learning Mode giữa lượt theo [DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md) mục MentorSession). Giữ 2 entity riêng cho phép: theo dõi tiến độ ở mức phạm vi (SubSession) mà không cần đếm/duyệt từng lượt chat; đồng thời giữ nguyên `MentorSession` đã có từ Round 1 mà không cần định nghĩa lại ý nghĩa của nó.

## Consequences

- `SubSession` cần trường tham chiếu ngược tới các `MentorSession` thuộc nó (đã phác thảo là `mentor_session_refs[]` ở [LearningSessionDomain.md](../03_Domain_Model/LearningSessionDomain.md) — nay chính thức là quan hệ 1-nhiều, không phải tham chiếu tùy chọn).
- `MentorSession` **không đổi định nghĩa** — vẫn write-owner bởi Mentor Interaction Domain, vẫn sinh Evidence; chỉ thêm 1 trường liên kết ngược tới `SubSession` đang active khi `MentorSession` đó diễn ra.
- Đóng Open Question #22. [LearningSessionDomain.md](../03_Domain_Model/LearningSessionDomain.md) cần cập nhật Aggregate Root, Domain Events, Open Questions theo hierarchy 3 tầng này.
- Không tạo Ownership Conflict: `SubSession` vẫn write-owner bởi Learning Session Domain; `MentorSession` vẫn write-owner bởi Mentor Interaction Domain — quan hệ giữa 2 domain là tham chiếu, không phải sở hữu chéo.

## Related Documents

- [DECISION-028-Learning-Session-Domain](DECISION-028-Learning-Session-Domain.md)
- [Docs/03_Domain_Model/LearningSessionDomain.md](../03_Domain_Model/LearningSessionDomain.md)
- [Docs/03_Domain_Model/DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md) mục MentorSession
- [Docs/01_PRD/OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 22
