# Knowledge Engine — Spec

> Thực thi: [DECISION-010](../../Docs/11_Decisions/DECISION-010-Knowledge-Graph.md), [DECISION-015](../../Docs/11_Decisions/DECISION-015-Knowledge-Engine.md). Thay thế nội dung cũ ở [AI/KnowledgeEngine/README.md](README.md) (vẫn giữ làm pointer ngắn).

## Vai trò

Knowledge Engine sở hữu **Knowledge Graph** — cấu trúc tri thức dùng chung, độc lập với Roadmap của bất kỳ Learner nào. Trách nhiệm:

1. Lưu trữ và truy vấn Knowledge Node + quan hệ giữa các Knowledge Node (cây/graph mở rộng động).
2. Quyết định khi nào một Knowledge Node cần mở rộng thành node con (Hybrid Dynamic Graph).
3. Cung cấp trạng thái Mastery hiện tại của 1 Learner cho 1 Knowledge Node (đọc, không tự ghi trực tiếp — ghi đến từ Evidence Engine).
4. Tổng hợp Knowledge Profile cho Learner xem (Capability "Knowledge Profile Synthesis", giữ nguyên từ AI Architecture gốc).

## Quan hệ với Engine khác

| Engine | Quan hệ |
|---|---|
| Roadmap Engine | Không sở hữu Knowledge Graph. Roadmap Node tham chiếu *đọc* tới N Knowledge Node qua quan hệ phụ thuộc (many-to-many) — không sửa cấu trúc Knowledge Graph. |
| Evidence Engine | Nguồn ghi duy nhất cập nhật Mastery của Knowledge Node theo Learner. Knowledge Engine không tự suy ra Mastery từ hành vi thô. |
| Assessment Engine | Đọc Knowledge Node + Mastery hiện tại để chọn nội dung verify phù hợp. |
| Teaching Engine | Đọc Knowledge Node (kể cả node con nếu đã mở) để biết phạm vi giảng dạy. |

## Capability mới cần thêm vào AI Architecture

**Knowledge Node Expansion** — quyết định mở rộng 1 Knowledge Node thành các node con (ví dụ JWT → Access Token/Refresh Token/Claims/Signature). Đây là một hành động AI riêng, không trộn vào Teaching hay Roadmap Proposal.

🔶 OPEN — ranh giới kiểm soát con người cho Knowledge Node Expansion (AI tự làm hay cần xác nhận) chưa chốt — xem [OpenQuestions.md](../../Docs/01_PRD/OpenQuestions.md) câu 8 (mới).

## Bất biến (giữ nguyên từ DECISION-010/015)

- Không Completed Status, không Topic Percentage đơn giản.
- Không có flag boolean "đã học".
- Knowledge Graph và Roadmap Graph là hai graph tách biệt.
