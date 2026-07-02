# DECISION-028 — Learning Session is an Independent Core Domain (Orchestrator)

- **Status:** Accepted (Locked) — adds a new Core Domain, does not restructure any Round 1-4 domain
- **Date:** 2026-06-27 (Round 5)

## Context

Qua Round 1-4, các domain (Goal & Roadmap, Knowledge Graph, Evidence, Assessment, Recommendation) đã có ranh giới rõ với nhau, nhưng chưa có domain nào chịu trách nhiệm **kết nối** chúng lại thành một luồng vận hành liên tục cho một mục tiêu học tập cụ thể. `MentorSession` (Mentor Interaction Domain) chỉ mô tả 1 lượt tương tác (chat), không đủ để biểu diễn toàn bộ vòng đời "Learner đang theo đuổi Goal X, qua nhiều MentorSession, nhiều lượt Evidence/Assessment, có thể rẽ nhánh".

## Decision

**Learning Session là Core Domain độc lập**, đóng vai trò **Orchestrator Domain**.

Learning Session kết nối (đọc/điều phối, không sở hữu định nghĩa):
- Goal
- Roadmap
- Knowledge (Knowledge Graph)
- Evidence
- Assessment
- Recommendation

Đặc điểm:
1. **Learning Session không phải chat session.** Nó không thay thế `MentorSession` (vẫn là 1 lượt tương tác) — Learning Session là tầng trên, theo dõi tiến trình hướng tới một mục tiêu, không phải nội dung từng lượt hội thoại.
2. **Learning Session đại diện cho một mục tiêu học tập** — gắn 1:1 (hoặc 1:n trong vòng đời, nếu Goal đổi giữa đường — xem Open Question mới) với một `Goal` đang active.
3. **Learning Session có thể chứa nhiều Sub Sessions** — một Sub Session là một lát cắt nhỏ hơn của tiến trình (ví dụ: 1 cụm `MentorSession` xoay quanh 1 `RoadmapNode`/`KnowledgeNode` cụ thể), cho phép theo dõi tiến độ ở độ phân giải nhỏ hơn mà không phá vỡ tính liên tục của Learning Session cha.

## Reasoning

Không có domain nào trong Round 1-4 đóng vai trò điều phối — mỗi domain chỉ biết về chính nó (đúng theo nguyên tắc tách domain rõ ràng), nhưng hệ quả là không có nơi nào trả lời được câu hỏi "Learner này, với Goal này, đang ở đâu trong toàn bộ vòng đời học tập, qua tất cả Roadmap/Knowledge/Evidence/Assessment/Recommendation liên quan". Đây là khoảng trống cần lấp trước khi có thể thiết kế Database cho lớp điều phối (orchestration/state machine), vì nếu không có Aggregate Root rõ cho "1 mục tiêu học tập đang diễn ra", các domain khác sẽ bị ép phải tự suy luận ngữ cảnh phiên — vi phạm ranh giới đã thiết lập.

## Consequences

- Cần tài liệu domain riêng — [Docs/03_Domain_Model/LearningSessionDomain.md](../03_Domain_Model/LearningSessionDomain.md).
- [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) cần thêm Learning Session là Domain #10 (Orchestrator), với ranh giới rõ: **chỉ điều phối/đọc trạng thái tổng hợp, không ghi đè lên write-ownership đã chốt của domain khác** (không vi phạm DECISION-026 — Assessment vẫn là write-owner duy nhất của `KnowledgeNodeMastery`; Learning Session không tạo write-owner conflict).
- `MentorSession` (Mentor Interaction Domain, Round 1) cần làm rõ quan hệ với Sub Session — 🔶 OPEN, xem [LearningSessionDomain.md](../03_Domain_Model/LearningSessionDomain.md) mục Open Questions: liệu Sub Session = MentorSession đổi tên, hay là 1 entity mới ở giữa MentorSession và Learning Session.
- Đặt ra câu hỏi mới về vòng đời khi Goal đổi giữa đường (liên quan Gap 7, [RequirementGaps.md](../01_PRD/RequirementGaps.md)) — chưa quyết định ở Round này.

## Related Documents

- [DECISION-004-Goal-Oriented-Learning-Philosophy](DECISION-004-Goal-Oriented-Learning-Philosophy.md)
- [DECISION-026-Assessment-Core-Domain](DECISION-026-Assessment-Core-Domain.md)
- [Docs/03_Domain_Model/CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md)
- [Docs/03_Domain_Model/LearningSessionDomain.md](../03_Domain_Model/LearningSessionDomain.md)
