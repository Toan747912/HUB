# DECISION-010 — Knowledge Graph

- **Status:** Accepted (Locked)
- **Date:** 2026-06-27

## Context

Cần một cấu trúc dữ liệu trung tâm lưu trạng thái hiểu biết của người học, thay vì các flag boolean rời rạc.

## Decision

Knowledge Graph là **thành phần trung tâm của hệ thống**. Hệ thống KHÔNG lưu "đã học JWT" (boolean) — mà lưu theo từng concept:

```
JWT
├── Remember
├── Explain
├── Apply
├── Teach
├── Evidence
├── Confidence
└── Mastery Score
```

## Reasoning

Boolean "đã học" không phân biệt được giữa "đã đọc qua" và "đã thực sự hiểu" — vi phạm trực tiếp nguyên tắc 2. Knowledge Graph theo concept (không theo lesson) cho phép tái sử dụng dữ liệu hiểu biết xuyên suốt nhiều Roadmap/Goal khác nhau của cùng một Learner.

## Consequences

- Domain Model: `ConceptMastery` là quan hệ Learner↔Concept, không phải thuộc tính của RoadmapNode/Lesson — Concept tồn tại độc lập với Roadmap cụ thể.
- 🔶 Kiểu dữ liệu cụ thể cho Confidence/Mastery Score chưa quyết định (Gap 5) — chờ kiến trúc dữ liệu chi tiết hơn.

## Related Documents

- [Docs/03_Domain_Model/DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md) — entity `Concept`, `ConceptMastery`
- [Product/KnowledgeModels/KnowledgeGraphModel.md](../../Product/KnowledgeModels/KnowledgeGraphModel.md)
- [AI/KnowledgeEngine](../../AI/KnowledgeEngine/README.md)
- [Docs/01_PRD/RequirementGaps.md](../01_PRD/RequirementGaps.md) — Gap 5
