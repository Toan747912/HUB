# Knowledge Graph Model — Engine-level Spec

> Bản chi tiết theo [DECISION-015](../../Docs/11_Decisions/DECISION-015-Knowledge-Engine.md), [DECISION-023](../../Docs/11_Decisions/DECISION-023-Controlled-Knowledge-Expansion.md), [DECISION-024](../../Docs/11_Decisions/DECISION-024-Concept-Is-KnowledgeNode.md), [DECISION-025](../../Docs/11_Decisions/DECISION-025-Knowledge-Graph-DAG.md) (Round 4), **[DECISION-029](../../Docs/11_Decisions/DECISION-029-Cycle-Detection-Strategy.md) (Round 5)**. Bản tham chiếu rút gọn vẫn ở [Product/KnowledgeModels/KnowledgeGraphModel.md](../../Product/KnowledgeModels/KnowledgeGraphModel.md).
>
> **Round 4:** Knowledge Graph chính thức là **DAG** — `Expansion Edge` (cây, 1 cha) đổi thành `KnowledgeEdge` tổng quát (multi-parent, multi relation-type). Mô tả dưới đây viết lại theo graph semantics, không còn hierarchy semantics.

## Cấu trúc graph (DAG, Round 4)

Knowledge Graph là một **Directed Acyclic Graph (DAG)** gồm:

- **Knowledge Node** — đơn vị tri thức (xem [KnowledgeNode.md](KnowledgeNode.md)).
- **`KnowledgeEdge`** *(đổi tên từ "Expansion Edge")* — cạnh có hướng giữa 2 KnowledgeNode, mang `relation_type`. Một node có thể có **nhiều cạnh vào** (nhiều cha) và **nhiều cạnh ra** (nhiều con/liên quan). Ví dụ: `Validation` có thể nhận cạnh từ cả `Multipart Form` và `Storage`.
- **Dependency Edge** (RoadmapNode → KnowledgeNode, many-to-many) — không đổi, vẫn thuộc Roadmap Graph, tham chiếu sang Knowledge Graph, không phải `KnowledgeEdge`.

```
                Roadmap Graph                 Knowledge Graph (DAG)
                ─────────────                 ──────────────────────
Goal
 └── Upload Video  ──depends_on──┬──▶ HTTP
                                 ├──▶ Multipart Form ──┐
                                 ├──▶ Streams           │
                                 ├──▶ Validation ◀──────┼──── (2 cạnh vào, multi-parent)
                                 └──▶ Storage ──────────┘

                                              JWT
                                              ├──expands_to──▶ Access Token
                                              ├──expands_to──▶ Refresh Token ──expands_to──┬──▶ Rotation
                                              ├──expands_to──▶ Claims                       ├──▶ Revocation
                                              └──expands_to──▶ Signature                    └──▶ Expiration
```

## `relation_type` — danh sách khởi điểm (🔶 chưa đầy đủ, chờ xác nhận)

| relation_type | Ý nghĩa | Ảnh hưởng truy vấn |
|---|---|---|
| `expands_to` | Node cha phân rã thành node con chi tiết hơn (Hybrid Dynamic Graph gốc) | Coi là "structural" — định nghĩa độ sâu/traversal mặc định |
| `prerequisite_of` | Phải hiểu node A trước khi học node B *(đề xuất mới, chưa có trong brief gốc)* | "structural" — dùng cho gap-detection của Recommendation Engine |
| `related_to` | Liên quan nhưng không bắt buộc thứ tự | "associative" — không tính vào độ sâu/prerequisite check |

🔶 OPEN *(mới, Round 4)* — đây là đề xuất khởi điểm của Claude để DECISION-025 có ý nghĩa thực thi được, **chưa phải danh sách đầy đủ đã chốt**. Cần Founder/ChatGPT xác nhận hoặc bổ sung.

## Nguyên tắc Hybrid Dynamic Graph (giữ nguyên tinh thần, áp dụng trên DAG)

- Một Knowledge Node bắt đầu **chưa mở rộng** — chưa có cạnh `expands_to` đi ra.
- Mở rộng chỉ xảy ra khi có lý do thật — không mở rộng toàn bộ graph trước.
- Không có độ sâu tối đa cố định.
- *(mới, Round 4)* Mở rộng tạo 1 `KnowledgeEdge` mới — node con có thể **đã tồn tại** (nếu một node tương tự đã được tạo từ nhánh khác) và chỉ cần thêm cạnh mới (multi-parent), không nhất thiết tạo node mới mỗi lần.

## Bất biến cần Application/Domain Layer đảm bảo

- **Cycle detection (Round 4, tổng quát hơn):** không được tồn tại đường đi nào (qua bất kỳ chuỗi `KnowledgeEdge` nào, không chỉ trực tiếp) khiến một node trở thành tổ tiên của chính nó. Đây nặng hơn kiểm tra cây cũ ("không là con của chính nó") — cần thuật toán kiểm tra reachability trước khi tạo edge mới. **Cơ chế cụ thể: ✅ đã chốt ở Round 5, [DECISION-029](../../Docs/11_Decisions/DECISION-029-Cycle-Detection-Strategy.md) — Runtime Reachability Check (không closure table ở v1)**, xem [ROUND4_DOMAIN_REVIEW.md](../../Docs/03_Domain_Model/ROUND4_DOMAIN_REVIEW.md) cho phân tích đánh đổi gốc.
- Dependency Edge (Roadmap→Knowledge) không ảnh hưởng cấu trúc `KnowledgeEdge` — sửa Roadmap không bao giờ sửa Knowledge Graph.

## Controlled Expansion ([DECISION-023](../../Docs/11_Decisions/DECISION-023-Controlled-Knowledge-Expansion.md))

2 loại mở rộng, khác hành vi:

| Loại | Tiêu chí | Hành vi | Entity ghi nhận |
|---|---|---|---|
| **Local** | Mở 1 cấp (cạnh trực tiếp) của node đang dùng trong phiên hiện tại; không tạo Dependency Edge mới | AI tự làm, không cần lý do hiển thị bắt buộc cho Learner — **nhưng vẫn phải log lý do nội bộ truy vết được** (DECISION-027, *Round 4*) | Domain Event `KnowledgeNodeExpanded` (Local) + lý do nội bộ (entity ghi log cụ thể: 🔶 OPEN, xem Open Question mới) |
| **Deep/Structural** | Mở nhiều cấp trong 1 lượt, HOẶC node mới được gắn Dependency Edge tới RoadmapNode đang active | AI tự làm nhưng **bắt buộc** `expansion_reason`, hiển thị minh bạch cho Learner | `ExpansionRecord` |

🔶 OPEN — bảng tiêu chí trên là đề xuất kỹ thuật của Claude theo yêu cầu thiết kế ở DECISION-023, chưa được duyệt chi tiết bởi ChatGPT/Founder.
