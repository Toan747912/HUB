# DECISION-025 — Knowledge Graph is a DAG

- **Status:** Accepted (Locked) — resolves Open Question #16 (rủi ro lớn nhất, Round 3 Review)
- **Date:** 2026-06-27 (Round 4)

## Context

Domain Architecture Review Report (Round 3) phát hiện mô hình Expansion Edge giả định mỗi KnowledgeNode chỉ có 1 cha (cây) — không khớp bản chất tri thức thật (1 node có thể hợp lý thuộc nhiều cha, ví dụ "Validation" vừa thuộc "Multipart Form" vừa thuộc "Storage"). Đây được xác định là rủi ro lớn nhất trước Database Design.

## Decision

**Knowledge Graph là DAG (Directed Acyclic Graph), không dùng Tree.**

Yêu cầu:
- Hỗ trợ nhiều parent (1 KnowledgeNode có thể có nhiều node cha).
- Hỗ trợ nhiều relation type (không chỉ 1 loại quan hệ "expands_to").
- Có cycle detection — không cho phép tạo edge khiến graph có chu trình.
- Thiết kế theo **graph semantics** (node + edge có type, truy vấn bằng traversal) thay vì **hierarchy semantics** (parent/children đơn giản).

## Reasoning

Tri thức thực tế là mạng lưới, không phải cây phân cấp thuần — ép vào mô hình cây sẽ buộc phải nhân bản node (ví dụ tạo 2 "Validation" riêng dưới 2 cha khác nhau) hoặc chọn 1 cha "chính" tùy ý, cả hai đều làm giảm giá trị tái sử dụng tri thức mà DECISION-010/015 đã đặt ra làm mục tiêu trung tâm.

## Consequences

- Entity `Expansion Edge` (Round 2/3) đổi thành **`KnowledgeEdge`** tổng quát hơn: `from_node_id`, `to_node_id`, `relation_type` (enum mở, ví dụ khởi điểm: `expands_to`, `prerequisite_of`, `related_to` — 🔶 danh sách đầy đủ chưa chốt, xem Open Question mới), `created_via` (Local/Deep, theo DECISION-023).
- `KnowledgeNode.parent` (0..1) → `KnowledgeNode.parents[]` (0..n) — thay đổi cardinality.
- Cycle detection không còn đơn giản ("không là con của chính nó") — phải kiểm tra **không có đường đi nào** từ node đích quay lại node nguồn qua bất kỳ đường nào trong graph. Cơ chế cụ thể (runtime traversal vs closure table): 🔶 OPEN, xem [ROUND4_DOMAIN_REVIEW.md](../03_Domain_Model/ROUND4_DOMAIN_REVIEW.md) phần phân tích tác động Database Design.
- [AI/KnowledgeEngine/KnowledgeGraphModel.md](../../AI/KnowledgeEngine/KnowledgeGraphModel.md) và [KnowledgeNode.md](../../AI/KnowledgeEngine/KnowledgeNode.md) cập nhật theo DAG semantics.
- Recommendation Engine (đọc Knowledge Graph để phát hiện dependency gap) cần xử lý multi-parent — xem phân tích tác động trong ROUND4_DOMAIN_REVIEW.md.

## Related Documents

- [DECISION-015-Knowledge-Engine](DECISION-015-Knowledge-Engine.md)
- [Docs/03_Domain_Model/CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md)
- [Docs/03_Domain_Model/DOMAIN_ARCHITECTURE_REVIEW_ROUND3.md](../03_Domain_Model/DOMAIN_ARCHITECTURE_REVIEW_ROUND3.md) — phần phát hiện rủi ro
- [Docs/03_Domain_Model/ROUND4_DOMAIN_REVIEW.md](../03_Domain_Model/ROUND4_DOMAIN_REVIEW.md)
