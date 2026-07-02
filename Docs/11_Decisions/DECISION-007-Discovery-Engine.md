# DECISION-007 — Discovery Engine

- **Status:** Accepted (Locked)
- **Date:** 2026-06-27

## Context

Cần một cơ chế hiểu đúng mục tiêu và trình độ thật của người học, vì tự khai báo thường không đáng tin cậy hoàn toàn.

## Decision

Discovery Engine là trái tim hệ thống — không phải form khảo sát cố định, là quá trình đánh giá động (**Adaptive Discovery**).

Mục tiêu của Discovery:
1. Hiểu mục tiêu thật sự của user.
2. Đánh giá trình độ thực tế.
3. Phát hiện sai lệch giữa tự đánh giá và trình độ thực tế.

Hai khái niệm trung tâm:
- **SelfAssessmentMismatch**: AI phải ghi nhận khi tự đánh giá ≠ năng lực thực tế (ví dụ: user nói "Tôi biết Docker" — AI cần cơ chế xác minh).
- **Continuous Discovery**: discovery tiếp tục diễn ra trong suốt quá trình học, không chỉ ở onboarding.

🔶 OPEN — cơ chế xác minh cụ thể cho SelfAssessmentMismatch chưa được chốt (xem [Docs/01_PRD/OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 5).

## Reasoning

Một roadmap cá nhân hóa thật sự (nguyên tắc 4) không thể dựa hoàn toàn vào tự khai — nếu không, hệ thống chỉ là "form chọn độ khó" giả danh cá nhân hóa.

## Consequences

- AI Architecture cần Capability riêng cho Goal Clarification và Competency Probing, tách biệt khỏi Teaching (xem [Docs/04_AI_Architecture/AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md)).
- Domain Model cần entity `DiscoverySession` và `SelfAssessmentMismatch` riêng, không gộp vào ConceptMastery trực tiếp (mismatch là bằng chứng đầu vào, không phải bản thân mastery).

## Related Documents

- [Docs/03_Domain_Model/DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md)
- [AI/DiscoveryEngine](../../AI/DiscoveryEngine/README.md)
- [Docs/01_PRD/OpenQuestions.md](../01_PRD/OpenQuestions.md) — câu 5
