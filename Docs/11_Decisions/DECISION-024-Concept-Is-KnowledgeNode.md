# DECISION-024 — Concept and KnowledgeNode Are the Same Entity

- **Status:** Accepted (Locked) — resolves Open Question #1 (mục 6 CoreDomainMap), closes Backlog item B.1
- **Date:** 2026-06-27 (Round 3)

## Context

Từ Round 2, [DECISION-015](DECISION-015-Knowledge-Engine.md) và [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) đã giả định `Concept` (Round 1, [DECISION-010](DECISION-010-Knowledge-Graph.md)) và `KnowledgeNode` (Round 2) là cùng 1 entity — nhưng đây mới là giả định của Claude, chưa chính thức xác nhận, và `DomainModel_Draft.md` (Round 1) vẫn còn giữ entity `Concept` riêng với cardinality cũ.

## Decision

**Concept và KnowledgeNode là cùng một thực thể.** Loại bỏ mọi mô hình tách biệt Concept và KnowledgeNode. **KnowledgeNode trở thành đơn vị tri thức chuẩn của toàn hệ thống** — tên `Concept` không còn được dùng cho entity này từ thời điểm này.

## Reasoning

Xác nhận chính thức điều Claude đã giả định để tránh tài liệu tiếp tục mang 2 tên cho cùng 1 thứ — rủi ro nhầm lẫn tăng dần qua mỗi Round nếu không chốt sớm.

## Consequences

- `Docs/03_Domain_Model/DomainModel_Draft.md` (Round 1) **phải được sửa**: xóa entity `Concept` riêng, thay bằng tham chiếu tới `KnowledgeNode` (định nghĩa đầy đủ tại [AI/KnowledgeEngine/KnowledgeNode.md](../../AI/KnowledgeEngine/KnowledgeNode.md)); sửa cardinality `RoadmapNode *──1 Concept` (1:1, leaf-only) → `RoadmapNode *──* KnowledgeNode` (nhiều-nhiều, theo Dependency Edge của DECISION-015). Đây đóng lại nợ tài liệu B.1 đã ghi nhận từ Round 2.
- `Product/KnowledgeModels/KnowledgeGraphModel.md` cần sửa tương tự (đổi nhãn "Concept:" trong diagram thành "KnowledgeNode:").
- Mọi entity khác từng tham chiếu `Concept` (ví dụ `ConceptMastery`, `SelfAssessmentMismatch.concept liên quan`) đổi tên tham chiếu sang `KnowledgeNode`/`KnowledgeNodeMastery` cho nhất quán — `ConceptMastery` (Round 1) và `KnowledgeNodeMastery` (Round 2) cũng là cùng 1 entity, theo cùng logic.
- `DomainAssessmentMapping` (Gap 2, đa lĩnh vực) vẫn áp dụng — chỉ đổi từ "theo Concept" sang "theo KnowledgeNode", không đổi bản chất.

## Related Documents

- [DECISION-010-Knowledge-Graph](DECISION-010-Knowledge-Graph.md)
- [DECISION-015-Knowledge-Engine](DECISION-015-Knowledge-Engine.md)
- [Docs/03_Domain_Model/DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md)
- [Docs/03_Domain_Model/CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md)
- [AI/KnowledgeEngine/KnowledgeNode.md](../../AI/KnowledgeEngine/KnowledgeNode.md)
