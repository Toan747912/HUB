# DECISION-032 — Goal is Immutable

- **Status:** Accepted (Locked) — resolves Open Question #23
- **Date:** 2026-06-27 (Round 6 / Pre-Database Review)

## Context

[DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md) đã mô hình "1 Learner có 1 Goal active, nhiều Goal archived" từ trước, nhưng chưa chốt rõ liệu Goal có thể bị **sửa tại chỗ** (mutate) khi Learner đổi mục tiêu giữa đường, hay luôn phải tạo Goal mới. [DECISION-028](DECISION-028-Learning-Session-Domain.md) (Round 5) để mở câu hỏi tương ứng ở cấp `LearningSession` — xem [OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 23.

## Decision

**Goal là immutable.**

Khi Goal thay đổi:
1. **Goal mới được tạo** — không sửa field nào trên Goal hiện có.
2. **Learning Session cũ được archive** — `LearningSession` gắn với Goal cũ chuyển sang trạng thái lưu trữ (terminal), không tiếp tục nhận hoạt động mới.
3. **Không mutate Goal hiện có** — không có thao tác "update Goal" nào được phép trong toàn hệ thống; Goal chỉ có 2 hành động: tạo mới, hoặc archive (không xóa).

## Reasoning

Goal là gốc của toàn bộ Roadmap, Knowledge tracking, Evidence, Assessment cho một mục tiêu học tập — nếu cho phép sửa Goal tại chỗ, mọi `AssessmentResult`/`RecommendationProposal`/`KnowledgeNodeMastery` đã ghi nhận trước đó sẽ bị mất ngữ cảnh "đây là kết quả ứng với Goal nào tại thời điểm đó", trực tiếp vi phạm Explainability First (DECISION-027). Immutable Goal + tạo `LearningSession` mới giữ toàn bộ lịch sử tiến trình nguyên vẹn, nhất quán với cách `Evidence`/`AssessmentResult` đã được chốt là immutable log (chỉ thêm mới, không sửa/xóa).

## Consequences

- **Đóng Open Question #23.** `LearningSession` không có thao tác "đổi `goal_id` tại chỗ" — mọi lần đổi Goal là: tạo `Goal` mới → tạo `LearningSession` mới gắn Goal mới → archive `LearningSession` cũ.
- Việc archive `LearningSession` cũ khi Goal đổi là một nhánh cụ thể của trạng thái terminal đã có trong State Model ([LearningSessionDomain.md](../03_Domain_Model/LearningSessionDomain.md)) — không phải trạng thái mới; cần đối chiếu lại với 2 nhãn `Completed`/`Abandoned` đã có để tránh trùng khái niệm (xem cập nhật State Model trong tài liệu đó).
- `Goal History` (đã có trong [DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md), dùng cho `LearningProfile`) nay có ý nghĩa rõ hơn: là danh sách Goal immutable theo thời gian, mỗi Goal gắn 1 `LearningSession` (có thể nhiều nếu Learner quay lại Goal cũ — xem Lifecycle Learning Session).
- Không ảnh hưởng `Roadmap` (vẫn 1:1 với Goal, [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md)) — Roadmap của Goal cũ vẫn giữ nguyên, archive cùng Learning Session, không bị xóa.

## Related Documents

- [DECISION-027-Explainability-First](DECISION-027-Explainability-First.md)
- [DECISION-028-Learning-Session-Domain](DECISION-028-Learning-Session-Domain.md)
- [Docs/03_Domain_Model/LearningSessionDomain.md](../03_Domain_Model/LearningSessionDomain.md)
- [Docs/01_PRD/OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 23
- [Docs/01_PRD/RequirementGaps.md](../01_PRD/RequirementGaps.md) Gap 7
