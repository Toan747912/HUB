# DECISION-012 — Multi-Domain Scope

- **Status:** Accepted (Locked) — phạm vi MVP cụ thể vẫn 🔶 OPEN
- **Date:** 2026-06-27

## Context

Founder muốn sản phẩm không bị giới hạn vào lập trình, để tránh định vị hẹp như các nền tảng học code hiện có.

## Decision

Hệ thống phải hỗ trợ không chỉ Software Engineering, mà còn: AI, Thiết kế, Ngoại ngữ, Marketing, Kinh doanh, Kỹ năng nghề nghiệp.

🔶 OPEN — đây là tầm nhìn dài hạn hay yêu cầu MVP phải demo ngay từ đầu, vẫn chưa được Founder xác nhận. Xem [Docs/01_PRD/OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 3.

## Reasoning

Founder xác định rõ đây là một phần tầm nhìn cốt lõi, không phải mở rộng tùy chọn sau này.

## Consequences

- Knowledge Philosophy (4 cấp độ) cần một `DomainAssessmentMapping` riêng cho mỗi lĩnh vực trước khi Concept thuộc lĩnh vực đó được đưa vào hệ thống thật — đây là Gap 2, hiện chưa giải quyết cho lĩnh vực nào ngoài lập trình.
- MVP_Plan đề xuất (chưa phải quyết định) chỉ chọn 1 lĩnh vực (lập trình) để validate framework trước khi mở rộng — xem [Docs/09_MVP/MVP_Plan.md](../09_MVP/MVP_Plan.md).

## Related Documents

- [Docs/03_Domain_Model/DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md) — mục 4 Đa lĩnh vực
- [Product/Assessments](../../Product/Assessments/README.md)
- [Docs/01_PRD/OpenQuestions.md](../01_PRD/OpenQuestions.md) — câu 3
