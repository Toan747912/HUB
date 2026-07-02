# PRD v1 — AI Mentor OS

> Trạng thái: Draft v1. Tham chiếu [ProductVision.md](../00_Vision/ProductVision.md) và [Decisions Log](../11_Decisions/README.md).

## 1. Người dùng & vai trò trong sản phẩm

| Vai trò | Định nghĩa |
|---|---|
| Learner | Người học cuối, dùng sản phẩm để đạt mục tiêu thực tế |
| Mentor AI | AI đóng vai senior mentor, một thực thể duy nhất xuyên suốt (không phải nhiều bot riêng biệt) |

🔶 OPEN — chưa xác nhận có vai trò Admin/Curriculum Author trong v1 hay nội dung hoàn toàn do AI sinh động theo từng learner. Chưa có câu hỏi riêng cho điểm này trong [OpenQuestions.md](OpenQuestions.md) — bổ sung nếu Founder thấy cần ở vòng sau.

## 2. Use Case chính

### UC1 — Khởi tạo mục tiêu (Onboarding / Discovery)
- Learner nhập mục tiêu bằng ngôn ngữ tự nhiên (ví dụ "Xây web dịch lồng tiếng video").
- AI tiến hành **Adaptive Discovery**: hỏi thêm để hiểu mục tiêu thật, đánh giá trình độ thực tế, không dùng bộ câu hỏi cố định.
- AI phát hiện **SelfAssessmentMismatch** nếu có (cơ chế cụ thể: 🔶 OPEN, [OpenQuestions.md](OpenQuestions.md) câu 5).
- Output: Goal đã làm rõ + đánh giá trình độ ban đầu, làm input cho UC2.

### UC2 — Sinh Roadmap cấp cao
- AI sinh roadmap ở mức cao nhất (ví dụ: Backend / Frontend / AI / Deployment) — KHÔNG sinh chi tiết toàn bộ.
- Learner xem và có thể phản hồi/yêu cầu điều chỉnh.
- Mọi thay đổi cấu trúc roadmap cần Learner phê duyệt (Roadmap Governance).

### UC3 — Mở rộng Roadmap (Drill-down)
- Khi Learner chọn mở một nhánh (ví dụ Backend), AI sinh các nhánh con (API, Database, Authentication...) dựa trên: mục tiêu, trình độ hiện tại, kiến thức đã có trong Knowledge Graph.
- Lặp lại đến cấp độ nhánh lá (ví dụ Authentication → Session, JWT, OAuth).

### UC4 — Học một concept (Lesson)
- AI chọn Learning Mode phù hợp hoặc theo lựa chọn của Learner (A/B/C/D).
- Learner có thể đổi mode bất kỳ lúc nào trong lúc học.
- Sau khi học, đánh giá cập nhật vào Knowledge Graph theo 1 hoặc nhiều trong 4 cấp độ (Remember/Explain/Apply/Teach).

### UC5 — Verify hiểu (gắn với Mode B trở lên)
- AI kiểm tra hiểu thực sự (không chỉ output đúng).
- Có thể là câu hỏi, giải thích lại, hoặc áp dụng vào biến thể tình huống khác.
- Kết quả cập nhật Evidence/Confidence/Mastery Score cho concept tương ứng.

### UC6 — Bế tắc / Debug
- Khi Learner báo bị kẹt, AI hỗ trợ theo cơ chế chưa được chốt (🔶 OPEN — [OpenQuestions.md](OpenQuestions.md) câu 6: AI có sửa trực tiếp hay chỉ hint tăng dần).
- Nguyên tắc bắt buộc dù cơ chế nào: không để Learner kẹt quá lâu (nguyên tắc 6).

### UC7 — Xem hồ sơ tri thức (Knowledge Profile)
- Learner xem: goal hiện tại/cũ, roadmap cũ, điểm mạnh/yếu, lỗi thường gặp, kiến thức đã học theo 4 cấp độ, Mastery Score theo concept.

### UC8 — Continuous Discovery trong quá trình học
- AI tiếp tục đánh giá trình độ/goal trong suốt quá trình học (không chỉ ở onboarding), có thể phát hiện thêm SelfAssessmentMismatch mới hoặc goal đã thay đổi.

## 3. Yêu cầu phi chức năng (Non-functional)

| Hạng mục | Yêu cầu |
|---|---|
| Cá nhân hóa | Không có nội dung "chung cho mọi người" ở cấp lesson — mọi nội dung phải tham chiếu Knowledge Graph + Goal của riêng Learner đó |
| Minh bạch quyết định AI | Mọi đề xuất/cảnh báo/phản biện của AI phải có lý do hiển thị cho Learner, không phải hộp đen |
| Không khóa cứng learner | Learner luôn có quyền override đề xuất của AI (trừ khi vi phạm Roadmap Governance — AI không tự sửa, nhưng Learner luôn được sửa) |
| Tính liên tục bộ nhớ | User Memory phải tồn tại qua nhiều phiên, nhiều tháng — không reset giữa các session |

## 4. Tiêu chí chấp nhận theo nguyên tắc cốt lõi

| Nguyên tắc | Tiêu chí kiểm tra được |
|---|---|
| Không học vẹt | Mọi concept có ít nhất một cơ chế verify khác với "test pass" thuần |
| Hiểu > hoàn thành | Hoàn thành 1 exercise không tự động set mastery = Teach |
| Gắn với mục tiêu thực tế | Mỗi Lesson/Concept trong roadmap đều trace được ngược về 1 Goal cụ thể |
| AI thích nghi | Roadmap sinh ra cho 2 Learner cùng goal nhưng trình độ khác nhau phải khác nhau |
| User quyết định cuối | Mọi action sửa roadmap/structure có log "do Learner phê duyệt" |
| Không kẹt quá lâu | Có ngưỡng/thời gian cụ thể kích hoạt hỗ trợ chủ động — cơ chế cụ thể: 🔶 OPEN |
| AI phản biện không ép buộc | AI có thể đưa cảnh báo nhưng Learner luôn có action "vẫn tiếp tục theo ý tôi" |

## 5. Ngoài phạm vi v1 (Explicit Out of Scope)

- Mô hình kinh doanh / pricing — 🔶 OPEN nếu Founder muốn đưa vào, xem [OpenQuestions.md](OpenQuestions.md) câu 7.
- Đa lĩnh vực đầy đủ (6 lĩnh vực) cho MVP — phạm vi thực tế: 🔶 OPEN, xem [OpenQuestions.md](OpenQuestions.md) câu 3.
- Vai trò Admin/Curriculum Authoring (nếu có) — chưa được brief đề cập, cần xác nhận thêm nếu liên quan.
