# DECISION-019 — Recommendation Engine as Independent Capability

- **Status:** Accepted (Locked) — resolves Open Question #9 (Round 2) and Backlog item B.7
- **Date:** 2026-06-27 (Round 3)

## Context

Round 2 phát hiện không có Capability nào sở hữu việc tổng hợp tín hiệu rời rạc (Knowledge Regression, SelfAssessmentMismatch, Knowledge Node chưa mở rộng nhưng cần) thành gợi ý hành động cho Learner. Claude đưa ra phân tích 2 lựa chọn (độc lập vs gộp vào Capability có sẵn) tại [AI/RecommendationEngine/README.md](../../AI/RecommendationEngine/README.md), khuyến nghị chọn độc lập với phạm vi thu hẹp.

## Decision

**Recommendation Engine là Capability độc lập**, đúng theo khuyến nghị của Claude — xác nhận, không sửa phạm vi đề xuất:

- Recommendation Engine **chỉ tổng hợp tín hiệu** (Knowledge Regression, SelfAssessmentMismatch, Knowledge Node phụ thuộc chưa đủ mastery...) thành gợi ý.
- Luôn ở dạng **đề xuất**, không tự áp dụng.
- Giao hành động cụ thể lại cho Capability khác thực thi (Teaching Engine nếu là gợi ý ôn tập, Roadmap Critique nếu ngụ ý thay đổi cấu trúc — vẫn qua Roadmap Governance, DECISION-006).

## Reasoning

Giữ single-responsibility giữa các Capability đã có giá trị từ Round 1/2 (Roadmap Proposal vs Roadmap Critique, Knowledge Engine vs Evidence Engine) — tiếp tục áp dụng cho Recommendation Engine tránh nó "lấn" vào việc ra quyết định cấu trúc thay cho Roadmap Engine.

## Consequences

- Thêm Capability #13 vào [Docs/04_AI_Architecture/AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md).
- `AI/RecommendationEngine/README.md` cần cập nhật từ "khuyến nghị chờ quyết định" sang "đã quyết định" — không xóa phần phân tích cũ, chỉ cập nhật Status.
- Domain Event `KnowledgeRegressionDetected`/`SelfAssessmentMismatchDetected` trong [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) giờ chính thức có Recommendation Engine là consumer, không còn ghi "*(khuyến nghị)*".

## Related Documents

- [AI/RecommendationEngine/README.md](../../AI/RecommendationEngine/README.md)
- [Docs/04_AI_Architecture/AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md)
- [Docs/03_Domain_Model/CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md)
