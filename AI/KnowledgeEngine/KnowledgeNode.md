# Knowledge Node — Entity Spec

> Theo [DECISION-015](../../Docs/11_Decisions/DECISION-015-Knowledge-Engine.md), **[DECISION-025](../../Docs/11_Decisions/DECISION-025-Knowledge-Graph-DAG.md) (Round 4 — DAG, multi-parent)**.

## Định nghĩa

**Knowledge Node là đơn vị tri thức chuẩn của toàn hệ thống** ([DECISION-024](../../Docs/11_Decisions/DECISION-024-Concept-Is-KnowledgeNode.md), Round 3 — chính thức xác nhận, không còn là giả định). Tên `Concept` (Round 1) **không còn được dùng** cho entity này — mọi tài liệu cũ còn ghi "Concept" coi là tên lỗi thời, chưa cập nhật.

## Thuộc tính (mức mô hình, chưa phải schema)

| Thuộc tính | Ý nghĩa |
|---|---|
| `id` | Định danh |
| `label` | Tên hiển thị (ví dụ "JWT", "Refresh Token") |
| `domain` | Lĩnh vực (Programming/AI/Design/...) |
| `expansion_state` | `unexpanded` \| `expanded` — quyết định bởi Capability Knowledge Node Expansion |

*(Round 4)* `parent`/`children[]` (Round 1-3) **bị loại bỏ** — không còn phù hợp với DAG. Quan hệ giờ biểu diễn hoàn toàn qua `KnowledgeEdge` (xem [KnowledgeGraphModel.md](KnowledgeGraphModel.md)), không lưu trực tiếp trên node.

## Quan hệ (cập nhật Round 4 — DAG)

- 1 Knowledge Node có **0..n cạnh vào** (từ nhiều cha khác nhau) và **0..n cạnh ra** (tới nhiều con/node liên quan), qua `KnowledgeEdge` — không còn giới hạn 0..1 cha như Round 1-3.
- 1 Knowledge Node có thể được nhiều RoadmapNode (của nhiều Learner/Goal khác nhau) phụ thuộc vào (Dependency Edge, many-to-many) — không sở hữu bởi Roadmap nào.
- 1 Knowledge Node có 1 `KnowledgeNodeMastery` riêng cho mỗi Learner, **sở hữu bởi Assessment Domain** (đổi từ Round 3, xem [DECISION-026](../../Docs/11_Decisions/DECISION-026-Assessment-Core-Domain.md)) — xem [MasteryModel.md](MasteryModel.md).

## Lịch sử đổi tên (tham khảo, không còn là vấn đề mở)

| Round | Tên dùng | Cấu trúc nội tại | Quan hệ với RoadmapNode |
|---|---|---|---|
| 1 (DECISION-010) | `Concept` | Phẳng, không có con | 1:1, chỉ leaf node |
| 2 (DECISION-015) | `KnowledgeNode` (giả định cùng entity) | Có thể có con (Expansion Edge) | Many-to-many |
| 3 (DECISION-024) | `KnowledgeNode` (xác nhận chính thức) | — | — |
| 4 (DECISION-025) | `KnowledgeNode` | DAG — multi-parent, multi relation-type (qua `KnowledgeEdge`) | Many-to-many (không đổi) |

`DomainModel_Draft.md` đã được cập nhật trong Round 3 để khớp bảng trên (xem ghi chú đầu file đó).
