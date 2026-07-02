# DECISION-015 — Knowledge Engine Architecture

- **Status:** Accepted (Locked) — elaborates [DECISION-010](DECISION-010-Knowledge-Graph.md), does not contradict it
- **Date:** 2026-06-27 (Round 2)

## Context

DECISION-010 khóa nguyên tắc "lưu theo Concept, không lưu boolean đã học". Nhưng nó chưa nói rõ: (a) Concept có cấu trúc nội tại hay là một đơn vị phẳng, (b) Concept/Knowledge Graph quan hệ thế nào với Roadmap Graph. Khi triển khai cụ thể, Lead Architect (ChatGPT) và Founder nhận thấy nhiều concept thực tế (ví dụ JWT) có cấu trúc con (Access Token, Refresh Token, Claims, Signature...) cần được mô hình riêng, và việc gắn chặt 1 RoadmapNode ↔ 1 Concept là quá cứng — một Roadmap Node thực tế thường phụ thuộc nhiều Concept/Knowledge Node cùng lúc.

## Decision

1. Knowledge Engine **không sử dụng** Completed Status (boolean) hay Topic Percentage đơn giản — giữ nguyên tinh thần DECISION-010.
2. Knowledge Engine vận hành trên **Knowledge Graph + Evidence**.
3. Mỗi **Knowledge Node** có thể được mở rộng động thành các Knowledge Node con — **Hybrid Dynamic Graph**: chỉ mở rộng khi cần, không cố định độ sâu. Ví dụ:

```
JWT
├── Access Token
├── Refresh Token
├── Claims
└── Signature

→ mở Refresh Token →

Refresh Token
├── Rotation
├── Revocation
└── Expiration
```

4. **Knowledge Graph và Roadmap Graph là hai graph khác nhau.** Một Roadmap Node có thể phụ thuộc nhiều Knowledge Node (quan hệ nhiều-nhiều, không phải 1:1 leaf-to-concept). Ví dụ: Roadmap Node "Upload Video" phụ thuộc Knowledge Node: HTTP, Multipart Form, Streams, Validation, Storage.

## Reasoning

Cấu trúc phẳng "1 RoadmapNode = 1 Concept" (DomainModel_Draft.md hiện tại) không phản ánh được việc một module thực tế (Upload Video) luôn cần nhiều khái niệm nền tảng cùng lúc, và một khái niệm lớn (JWT) tự nó có cấu trúc con cần track mastery riêng (hiểu "Access Token" không có nghĩa hiểu "Refresh Token Rotation"). Tách 2 graph cho phép Knowledge Graph tái sử dụng xuyên suốt mọi Roadmap, đúng tinh thần DECISION-010, đồng thời Roadmap Graph vẫn giữ vai trò lộ trình cá nhân hóa theo Goal (DECISION-005).

## Consequences

- **Thuật ngữ:** "Knowledge Node" là phiên bản elaborate của entity `Concept` trong [DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md) — không phải entity song song mới. Cần một bản cập nhật Domain Model để đổi `Concept` → `KnowledgeNode` và đổi cardinality `RoadmapNode *──1 Concept` (1:1, chỉ leaf) → `RoadmapNode *──* KnowledgeNode` (nhiều-nhiều). Việc này được phản ánh trong [Docs/03_Domain_Model/CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md); bản cập nhật đầy đủ cho `DomainModel_Draft.md` được ghi nhận là nợ tài liệu trong Backlog (chưa thực hiện trong vòng này, để tránh sửa 2 nơi không đồng bộ).
- Knowledge Node cần một cơ chế mở rộng (expansion) — đây là một hành động AI cần Capability riêng, xem [AI/KnowledgeEngine/KnowledgeEngine.md](../../AI/KnowledgeEngine/KnowledgeEngine.md) và cập nhật [AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md).
- 🔶 OPEN — Knowledge Node Expansion có cần "phê duyệt" giống Roadmap Governance (DECISION-006) không, hay là hành động AI tự do vì đây là cấu trúc tri thức chung, không phải lộ trình cá nhân của Learner? Xem Open Question mới trong [OpenQuestions.md](../01_PRD/OpenQuestions.md).

## Related Documents

- [DECISION-005-Dynamic-Roadmap-System](DECISION-005-Dynamic-Roadmap-System.md)
- [DECISION-006-Roadmap-Governance](DECISION-006-Roadmap-Governance.md)
- [DECISION-010-Knowledge-Graph](DECISION-010-Knowledge-Graph.md)
- [AI/KnowledgeEngine/](../../AI/KnowledgeEngine/KnowledgeEngine.md)
- [Docs/03_Domain_Model/CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md)
