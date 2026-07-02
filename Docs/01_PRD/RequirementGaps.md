# Requirement Gaps — AI Mentor OS

Lỗ hổng yêu cầu phát hiện được từ brief gốc, xếp theo mức độ ảnh hưởng nếu không xử lý. Đây là phát hiện/đề xuất của Claude — không phải quyết định.

## Nghiêm trọng (chặn thiết kế kiến trúc tiếp theo)

### Gap 1 — Ranh giới adaptive vs governance chưa rõ
Brief có hai lực đối nghịch: "AI phải thích nghi" (nguyên tắc 4) và "AI không tự sửa roadmap" (Roadmap Governance). Nhưng "thích nghi" có thể nghĩa là thay đổi độ sâu/tốc độ/nội dung gợi ý — những thứ rất gần với "sửa roadmap". Nếu không phân lớp rõ, mọi implementation sau (Discovery, Adaptive Learning) sẽ liên tục mơ hồ về việc gì cần phê duyệt, việc gì AI tự làm.
**Đề xuất:** tách 2 lớp rõ ràng — *Roadmap Structure* (module/thứ tự — cần phê duyệt) vs *Learning Parameters* (độ khó, tốc độ, mode gợi ý — AI tự điều chỉnh, chỉ cần thông báo lý do, không cần phê duyệt trước). Đã đưa vào [OpenQuestions.md](OpenQuestions.md) câu 5.

### Gap 2 — Knowledge Philosophy (Remember/Explain/Apply/Teach) chưa tổng quát hóa cho lĩnh vực phi kỹ thuật
4 cấp độ khớp tự nhiên với lập trình (chạy được → giải thích → áp dụng biến thể → dạy lại/code review). Với Marketing hoặc Ngoại ngữ, "Apply" và "Teach" cần định nghĩa khác hẳn (ví dụ Marketing: Apply = chạy 1 campaign thực, Teach = phản biện được chiến lược của người khác). Nếu Scope đa lĩnh vực là thật cho MVP, đây là lỗ hổng chặn cả Domain Model và AI Architecture.
**Đề xuất:** với mỗi lĩnh vực được đưa vào MVP, cần một "Assessment Mapping" riêng cho 4 cấp độ trước khi build Knowledge Graph cho lĩnh vực đó.

### Gap 3 — Không có cơ chế xử lý khi Learner sai mục tiêu/roadmap không hợp lý
Nguyên tắc 7 nói AI được phản biện nhưng không ép buộc. Nhưng nếu Learner kiên quyết chọn một roadmap về cơ bản không khả thi (ví dụ goal mâu thuẫn trình độ + thời gian), brief không nói rõ giới hạn: AI có quyền từ chối tạo nội dung không, hay luôn phải tuân theo?
**Đề xuất:** định nghĩa rõ "phản biện" có giới hạn — ví dụ AI luôn phải tạo nội dung nhưng được gắn cảnh báo rủi ro hiển thị liên tục, không bao giờ từ chối hoàn toàn.

## Trung bình (ảnh hưởng UX/chất lượng, không chặn kiến trúc)

### Gap 4 — Không có định nghĩa "kẹt quá lâu"
Nguyên tắc 6 không định lượng. Không có ngưỡng (thời gian, số lần thử sai) để kích hoạt hỗ trợ chủ động.
**Đề xuất:** cần một bộ tín hiệu cụ thể (thời gian không hành động, số lần submit sai liên tiếp, lặp lại câu hỏi tương tự) — đây nên là một phần của AI Architecture Draft, đánh dấu mức ưu tiên thiết kế ở vòng kiến trúc kế tiếp.

### Gap 5 — Mastery Score chưa có công thức/định nghĩa định lượng
Biết là cần "Evidence/Confidence/Mastery Score" nhưng không biết là điểm số, enum, hay trạng thái. Ảnh hưởng tới Domain Model (kiểu dữ liệu) và UI hiển thị hồ sơ tri thức.
**Đề xuất:** để mức draft trong Domain Model là "đủ trừu tượng để chưa cần quyết định kiểu dữ liệu cụ thể" — không chặn tài liệu hiện tại, nhưng phải giải quyết trước khi thiết kế DB.

### Gap 6 — Quan hệ giữa Learning Mode và Knowledge Level chưa rõ
Mode C (Socratic) có thể không phù hợp để đạt "Teach" level trực tiếp — nhưng brief không nói mode nào hỗ trợ đạt level nào. Nguy cơ: Learner chọn mode A liên tục và không bao giờ đạt Explain/Apply/Teach.
**Đề xuất:** một bảng mapping Mode → Level hỗ trợ tốt nhất, ở vòng AI Architecture.

## Thấp (đáng ghi nhận, không cấp bách)

### Gap 7 — Không có cơ chế Learner từ bỏ/đổi goal giữa đường
User Memory lưu "goal cũ" — gợi ý rằng đổi goal là tình huống dự kiến — nhưng không có use case mô tả luồng này (roadmap cũ giữ lại thế nào, kiến thức đã học có tái dùng cho goal mới không).

### Gap 8 — Không có định nghĩa thất bại sản phẩm (failure mode)
Brief mô tả trải nghiệm thành công mong muốn (5 câu North Star) nhưng không có "what does failure look like" — ví dụ Learner cảm thấy bị hỏi quá nhiều (Discovery quá dài) hoặc bị AI phản biện quá mức (vi phạm ngầm nguyên tắc 7). Nên có ở PRD v2 sau khi MVP có dữ liệu thật.
