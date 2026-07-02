# DECISION-029 — Knowledge Graph Cycle Detection Strategy

- **Status:** Accepted (Locked) — resolves Open Question #19 (chặn Database Design cho `knowledge_edges`)
- **Date:** 2026-06-27 (Round 5)

## Context

[DECISION-025](DECISION-025-Knowledge-Graph-DAG.md) (Round 4) xác nhận Knowledge Graph là DAG, đòi hỏi kiểm tra reachability (không phải kiểm tra cây đơn giản) trước khi thêm `KnowledgeEdge` mới. [ROUND4_DOMAIN_REVIEW.md](../03_Domain_Model/ROUND4_DOMAIN_REVIEW.md) mục 6 xác định đây là **điểm chặn duy nhất thực sự** trước khi hoàn thiện schema/index cho `knowledge_edges`, với 2 hướng đánh đổi: Runtime Traversal (đơn giản hơn, chi phí đọc khi ghi) vs Closure Table (đọc nhanh, ghi/bảo trì phức tạp hơn).

## Decision

**Sử dụng Runtime Reachability Check** (duyệt graph tại thời điểm thêm cạnh — kiểm tra B có thể reach tới A trước khi cho phép thêm cạnh A→B) cho phiên bản đầu.

**Không sử dụng Closure Table** ở phiên bản đầu.

Ưu tiên theo thứ tự: **Đơn giản → Dễ hiểu → Dễ bảo trì**. Chỉ chuyển sang tối ưu (closure table hoặc cơ chế khác) khi có **bằng chứng cụ thể về vấn đề hiệu năng** trong vận hành thực tế (không tối ưu sớm dựa trên suy đoán).

## Reasoning

Ở giai đoạn hiện tại, Knowledge Graph chưa có dữ liệu thực tế về độ lớn/độ rậm (số cạnh trung bình mỗi node, độ sâu graph) — chọn giải pháp phức tạp hơn (closure table) để tối ưu một bài toán chưa biết quy mô là tối ưu sớm, đi ngược nguyên tắc "đơn giản trước". Runtime traversal là phương án có chi phí bảo trì thấp nhất (không có bảng phụ nào cần đồng bộ khi sửa/xóa cạnh), và chi phí đọc-khi-ghi (tại thời điểm thêm cạnh, không phải tại thời điểm truy vấn thông thường) là chấp nhận được vì thêm `KnowledgeEdge` không phải hành động xảy ra với tần suất cao (so với đọc graph để dạy/đánh giá).

## Consequences

- Schema `knowledge_edges` (`from_node_id`, `to_node_id`, `relation_type`, `created_via`) có thể hoàn thiện **không cần thêm bảng closure phụ**.
- Index 2 chiều (`from_node_id`, `to_node_id`) vẫn cần (đã nêu ở Round 4) — đủ để runtime traversal thực hiện được hiệu quả.
- **Đóng Open Question #19** — không còn điểm chặn nào với Database Design của `knowledge_edges` ở mức nguyên tắc.
- Việc thực thi cụ thể thuật toán reachability (DFS/BFS, có cache tạm trong 1 transaction hay không) là chi tiết Application Layer, không phải quyết định ở mức Domain Architecture này — để lại cho ChatGPT (Lead Architect) khi vào Application/Database Design.
- Nếu sau này phát hiện vấn đề hiệu năng thật (đo được, không suy đoán), việc chuyển sang closure table là một "yêu cầu mở khóa" quyết định này, không phải sửa thông thường (theo GOVERNANCE.md).

## Related Documents

- [DECISION-025-Knowledge-Graph-DAG](DECISION-025-Knowledge-Graph-DAG.md)
- [Docs/03_Domain_Model/ROUND4_DOMAIN_REVIEW.md](../03_Domain_Model/ROUND4_DOMAIN_REVIEW.md)
- [AI/KnowledgeEngine/KnowledgeGraphModel.md](../../AI/KnowledgeEngine/KnowledgeGraphModel.md)
- [Docs/01_PRD/OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 19
