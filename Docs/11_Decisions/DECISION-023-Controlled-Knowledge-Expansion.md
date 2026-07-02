# DECISION-023 — Knowledge Expansion Governance (Controlled Expansion)

- **Status:** Accepted (Locked) — resolves Open Question #8
- **Date:** 2026-06-27 (Round 3)

## Context

Round 2 để ngỏ: Knowledge Node Expansion thuộc "AI tự làm" hay "cần Learner phê duyệt" trong Human Control Boundaries. Founder/Lead Architect chọn một mô hình trung gian, không rơi vào 1 trong 2 cực.

## Decision

- **AI được phép tự mở rộng Knowledge Graph ở phạm vi cục bộ và hợp lý** — không cần Learner phê duyệt cho các mở rộng nhỏ.
- **Mở rộng sâu hoặc làm thay đổi đáng kể cấu trúc học tập phải có lý do học tập rõ ràng** (không nhất thiết cần phê duyệt trước như Roadmap Governance, nhưng phải minh bạch — có lý do hiển thị được).
- Cơ chế thực thi gọi là **Controlled Expansion**.

## Thiết kế Controlled Expansion (đề xuất của Claude theo yêu cầu thiết kế, chưa phải đã được ChatGPT duyệt chi tiết)

| Loại mở rộng | Tiêu chí | Hành vi |
|---|---|---|
| **Local (tự làm)** | Mở 1 cấp (chỉ con trực tiếp) của 1 Knowledge Node đang dùng trong phiên hiện tại; không tạo Dependency Edge mới tới RoadmapNode nào | AI tự thực hiện, ghi Domain Event `KnowledgeNodeExpanded`, không cần lý do hiển thị bắt buộc |
| **Deep/Structural (cần lý do rõ ràng)** | Mở nhiều cấp trong 1 lượt (sinh cả cây con nhiều tầng); HOẶC node mới tạo ra được gắn Dependency Edge tới RoadmapNode đang active của Learner | AI thực hiện kèm `expansion_reason` bắt buộc, hiển thị cho Learner ngay (minh bạch, không phải xin phép trước) — ghi vào entity mới `ExpansionRecord` (nhẹ hơn `ApprovalRecord`, không chặn hành động, chỉ ghi nhận lý do) |

🔶 OPEN — bảng tiêu chí trên là đề xuất kỹ thuật của Claude để cụ thể hóa nguyên tắc Founder đã chốt, **chưa được xác nhận chi tiết**. Founder/ChatGPT cần duyệt hoặc chỉnh lại ranh giới "cục bộ và hợp lý" vs "sâu/đáng kể".

## Reasoning

Founder muốn tránh 2 cực: (a) AI tự do tuyệt đối với Knowledge Graph (rủi ro graph phình to không kiểm soát, Learner không biết vì sao nội dung thay đổi), (b) bắt mọi mở rộng phải phê duyệt như Roadmap (quá nặng, vì Knowledge Graph là tri thức chung không phải lộ trình cá nhân — khác bản chất với Roadmap Governance ở DECISION-006).

## Consequences

- `Docs/04_AI_Architecture/AIArchitecture_Draft.md` mục 3 (Human Control Boundaries): dòng "🔶 Chưa phân loại — Knowledge Node Expansion" được thay bằng phân loại 2 tier cụ thể trên.
- Domain Model cần entity mới `ExpansionRecord` — khác `ApprovalRecord` (không chặn hành động, chỉ ghi lý do + hiển thị).
- [AI/KnowledgeEngine/KnowledgeGraphModel.md](../../AI/KnowledgeEngine/KnowledgeGraphModel.md) cần mô tả 2 loại mở rộng này.

## Related Documents

- [DECISION-006-Roadmap-Governance](DECISION-006-Roadmap-Governance.md) — đối chiếu mô hình governance khác
- [DECISION-015-Knowledge-Engine](DECISION-015-Knowledge-Engine.md)
- [AI/KnowledgeEngine/KnowledgeGraphModel.md](../../AI/KnowledgeEngine/KnowledgeGraphModel.md)
- [Docs/04_AI_Architecture/AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md)
