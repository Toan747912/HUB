# Governance — AI Mentor OS Workspace

## 1. Phân quyền

**Founder (User)**
- Là người ra quyết định cuối cùng cho mọi nội dung trong workspace.
- Là người duy nhất được phép phê duyệt một quyết định mới hoặc mở khóa một quyết định trong `11_Decisions/`.
- Là người trung gian truyền đạt định hướng kiến trúc từ ChatGPT (Lead Architect) sang workspace này, trừ khi có quy trình khác được xác nhận (xem [OpenQuestions.md](01_PRD/OpenQuestions.md) câu 2).

**ChatGPT — Lead Architect**
- Dẫn dắt các quyết định kiến trúc sản phẩm (system design, AI architecture, data model ở mức định hướng).
- Không trực tiếp truy cập workspace này; output của ChatGPT được đưa vào qua Founder.

**Claude — Co-Architect / Documentation Manager / Requirements Analyst**
- Tổ chức tri thức dự án thành tài liệu có cấu trúc, nhất quán.
- Phát hiện lỗ hổng yêu cầu (requirement gaps) và lỗ hổng kiến trúc.
- Đề xuất cải tiến — nhưng **không tự ý** thay đổi quyết định đã khóa.
- Khi gặp nội dung từ ChatGPT mâu thuẫn với tài liệu hiện có: ghi nhận mâu thuẫn rõ ràng, không tự chọn bên thắng, đưa lên Founder quyết định.
- Không tự giả định khi thiếu thông tin — đưa vào `OpenQuestions.md`.

## 2. Quy trình thay đổi Decision Log

Decision Log không còn là 1 file duy nhất — mỗi quyết định kiến trúc/sản phẩm là **1 file riêng** trong `11_Decisions/`, đặt tên `DECISION-XXX-Slug.md`, theo template Title/Status/Context/Decision/Reasoning/Consequences/Related Documents.

1. Quyết định mới chỉ được tạo file trong `11_Decisions/` sau khi Founder xác nhận rõ (bằng văn bản, trong hội thoại).
2. Khi một quyết định đã `Accepted`/`Locked` cần thay đổi: đây được coi là **yêu cầu mở khóa (unlock request)**, không phải sửa thông thường. Phải được Founder nêu rõ ràng là "mở khóa lại DECISION-XXX" trước khi sửa. Khi mở khóa, không xóa nội dung cũ — thêm mục "Superseded by" và tạo file DECISION mới, giữ lịch sử nguyên vẹn (giống `Status: Superseded`).
3. File `11_Decisions/README.md` là bảng index — mọi quyết định mới/đổi trạng thái phải được phản ánh vào bảng này ngay khi tạo/sửa file decision.
4. Mỗi file decision phải liệt kê "Related Documents" trỏ tới mọi tài liệu khác (Docs/Product/AI) bị ảnh hưởng, để truy vết ngược khi quyết định thay đổi.

## 3. Quy trình xử lý điểm chưa rõ

- Không tự suy diễn câu trả lời cho điểm mơ hồ trong brief.
- Mọi điểm mơ hồ → thêm vào `01_PRD/OpenQuestions.md` kèm lý do tại sao nó quan trọng.
- Tài liệu vẫn được viết đầy đủ xung quanh điểm mơ hồ đó, đánh dấu rõ phần phụ thuộc là **🔶 OPEN**, để không chặn toàn bộ tiến độ tài liệu.

## 4. Quy trình đồng bộ với ChatGPT (Lead Architect)

🔶 OPEN — chưa xác nhận: cơ chế chuyển giao quyết định kiến trúc từ ChatGPT sang workspace này (Founder paste lại nguyên văn? Có tài liệu trung gian riêng?). Xem [OpenQuestions.md](01_PRD/OpenQuestions.md) câu 2.

Quy tắc tạm thời cho tới khi xác nhận: khi Founder cung cấp output từ ChatGPT, Claude sẽ:
1. Đối chiếu với các file trong `11_Decisions/` hiện có.
2. Nếu nhất quán → tích hợp vào tài liệu liên quan, ghi rõ nguồn ("theo định hướng của Lead Architect"), và tạo/cập nhật decision file tương ứng nếu đó là một quyết định mới.
3. Nếu mâu thuẫn → dừng, báo cáo mâu thuẫn cho Founder, không tự chọn bên đúng. Có thể đề xuất dùng `12_Meetings/` để ghi lại buổi đối chiếu này.

## 5. Nhiều AI Agent cùng tham gia

Workspace được thiết kế để nhiều AI Agent (Claude, ChatGPT, và các agent thực thi code trong `Apps/`) cùng đọc/viết theo thời gian. Quy tắc chung cho mọi Agent:
- Luôn đọc `Docs/Project_Index.md` trước khi thực hiện bất kỳ thay đổi nào.
- Không tự tạo quyết định kiến trúc mới ngoài `11_Decisions/` rồi áp dụng trực tiếp vào code/tài liệu khác — phải đi qua quy trình ở mục 2.
- Khi phát hiện thiếu tài liệu/gap, ghi vào `Docs/10_Backlog/Backlog.md`, không tự bịa nội dung để lấp đầy.
