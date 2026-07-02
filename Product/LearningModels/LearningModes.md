# Learning Modes — Reference

> Trích xuất từ [DECISION-008](../../Docs/11_Decisions/DECISION-008-Learning-Modes.md). Đây là tài liệu tham chiếu vận hành để AI Agent/engine implement TeachingEngine đọc trực tiếp, không cần lật lại toàn bộ PRD.

| Mode | Tên | Hành vi AI | Khi nên dùng |
|---|---|---|---|
| A | Explain | Giải thích trực tiếp khái niệm | Learner mới gặp concept lần đầu, cần nền tảng nhanh |
| B | Explain + Verify | Giải thích, sau đó đặt câu hỏi kiểm tra hiểu | Sau khi Explain, trước khi chuyển sang Apply |
| C | Socratic | Dẫn dắt bằng câu hỏi, không trả lời trực tiếp | Learner đã có nền tảng, cần tự suy luận để đạt Apply/Teach |
| D | Mentor | Kết hợp các mode trên theo tình huống | Khi Learner không chỉ định mode, hoặc bối cảnh phức tạp cần linh hoạt |

Quy tắc:
- Learner chuyển mode bất kỳ lúc nào, AI không tự chuyển mode mà không có lý do hiển thị.
- 🔶 OPEN — heuristic chọn mode mặc định khi Learner chưa từng chọn: xem [Docs/10_Backlog/Backlog.md](../../Docs/10_Backlog/Backlog.md) mục C.1.
- 🔶 OPEN — mapping Mode nào hỗ trợ tốt nhất cho cấp độ Knowledge nào (Remember/Explain/Apply/Teach): xem Gap 6 trong [Docs/01_PRD/RequirementGaps.md](../../Docs/01_PRD/RequirementGaps.md).
