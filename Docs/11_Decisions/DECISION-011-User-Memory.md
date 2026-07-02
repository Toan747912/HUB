# DECISION-011 — User Memory

- **Status:** Accepted (Locked)
- **Date:** 2026-06-27

## Context

Một mentor cá nhân hóa thật sự (DECISION-002) phải duy trì trí nhớ liên tục về người học — không thể reset trạng thái mỗi phiên.

## Decision

Hệ thống phải nhớ: goal hiện tại, goal cũ, roadmap cũ, điểm mạnh, điểm yếu, lỗi thường gặp, kiến thức đã học, mức độ hiểu. **Learner có quyền xem hồ sơ tri thức của chính mình.**

## Reasoning

Nếu không có trí nhớ liên tục, AI buộc phải hỏi lại hoặc đánh giá lại từ đầu mỗi phiên — vi phạm cảm giác North Star "Nó hiểu tôi" và làm tăng phiền hà, vi phạm gián tiếp nguyên tắc 6 (không để user bị kẹt quá lâu, ở đây là kẹt vì phải lặp lại).

## Consequences

- `LearningProfile` được mô hình hóa như một **view tổng hợp tính toán** từ ConceptMastery + DiscoverySession + Goal History, không phải một nguồn dữ liệu độc lập (xem [Docs/03_Domain_Model/DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md)).
- Cần UI/UC riêng (UC7 trong PRD) để Learner xem hồ sơ này.
- 🔶 Luồng đổi Goal (Goal cũ lưu thế nào, kiến thức có tái dùng được cho Goal mới) chưa chi tiết — xem Gap 7.

## Related Documents

- [Docs/03_Domain_Model/DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md) — entity `LearningProfile`
- [Docs/01_PRD/PRD_v1.md](../01_PRD/PRD_v1.md) — UC7
- [Docs/01_PRD/RequirementGaps.md](../01_PRD/RequirementGaps.md) — Gap 7
