# Knowledge Engine

Triển khai Capability: Knowledge Profile Synthesis, Knowledge Node Expansion (xem [Docs/04_AI_Architecture/AIArchitecture_Draft.md](../../Docs/04_AI_Architecture/AIArchitecture_Draft.md)).

Thực thi: [DECISION-010](../../Docs/11_Decisions/DECISION-010-Knowledge-Graph.md), [DECISION-015](../../Docs/11_Decisions/DECISION-015-Knowledge-Engine.md), [DECISION-016](../../Docs/11_Decisions/DECISION-016-Evidence-Based-Decay.md), [DECISION-017](../../Docs/11_Decisions/DECISION-017-Mastery-Framework.md).

Spec chi tiết (Round 2):
- [KnowledgeEngine.md](KnowledgeEngine.md) — vai trò, quan hệ với engine khác
- [KnowledgeGraphModel.md](KnowledgeGraphModel.md) — cấu trúc graph, Expansion Edge vs Dependency Edge
- [KnowledgeNode.md](KnowledgeNode.md) — entity spec, quan hệ với `Concept` cũ
- [MasteryModel.md](MasteryModel.md) — cấu trúc KnowledgeNodeMastery, quy tắc evidence-based update

Chưa có spec implementation/code thật (Database/API bị tạm dừng theo [DECISION-018](../../Docs/11_Decisions/DECISION-018-Domain-Modeling-Phase.md)).
