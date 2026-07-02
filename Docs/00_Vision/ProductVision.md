# Product Vision — AI Mentor OS

> Trạng thái: Draft v1, dựa trên [Decisions Log](../11_Decisions/README.md) Entry 0.

## 1. Sản phẩm là gì

AI Mentor OS là một **AI Apprenticeship Platform**. Không phải nơi chứa khóa học, không phải nơi giao bài tập, không phải giao diện chat AI. Đây là một hệ thống mô phỏng trải nghiệm **học nghề (apprenticeship)** dưới sự dẫn dắt của một mentor cá nhân hóa — AI đóng vai trò Senior Engineer/Senior Practitioner, không phải giáo viên giảng bài.

Sản phẩm này KHÔNG là:
- LMS (Learning Management System) — không quản lý lớp học, không có "giáo trình cố định cho tất cả".
- Nền tảng khóa học — không bán/phát video bài giảng tuần tự.
- FreeCodeCamp clone — không phải tập bài tập theo thứ tự tuyến tính, có thể skip.
- ChatGPT wrapper — không phải hộp chat trả lời câu hỏi rời rạc, không có trạng thái.

## 2. Mục tiêu sản phẩm

Với mỗi người học, sản phẩm phải đạt đồng thời 3 mục tiêu — thiếu một là thất bại:

1. **Hoàn thành mục tiêu thực tế** — người học làm ra được thứ họ muốn làm.
2. **Thực sự hiểu kiến thức** — không chỉ chạy được, mà hiểu vì sao nó chạy.
3. **Tự lập** — sau khi học, người học có thể tự xây sản phẩm tương tự mà không cần AI hỗ trợ lại từ đầu.

Một sản phẩm chỉ đạt (1) là "code generator". Một sản phẩm chỉ đạt (1)+(2) nhưng không đạt (3) là "gia sư giỏi nhưng làm người học lệ thuộc mãi". AI Mentor OS phải đạt đủ cả ba.

## 3. Bảy nguyên tắc cốt lõi

| # | Nguyên tắc | Hệ quả thiết kế |
|---|---|---|
| 1 | Không học vẹt | Mọi đánh giá phải kiểm tra hiểu, không chỉ kiểm tra output đúng |
| 2 | Hiểu quan trọng hơn hoàn thành | Hoàn thành task không tự động cập nhật mastery |
| 3 | Mọi kiến thức gắn với mục tiêu thực tế | Không có "học JavaScript" trừu tượng — luôn có một mục tiêu cụ thể làm bối cảnh |
| 4 | AI phải thích nghi theo từng người học | Không có một roadmap/nội dung chung cho tất cả |
| 5 | User luôn quyết định cuối cùng | AI không tự sửa roadmap, không tự khóa/mở nội dung mà không cho biết lý do |
| 6 | Không để user bị kẹt quá lâu | Phải có cơ chế hint/escalation khi user bế tắc — xem 🔶 OPEN #6 trong [OpenQuestions.md](../01_PRD/OpenQuestions.md) |
| 7 | AI được phản biện nhưng không ép buộc | AI có thể cảnh báo lựa chọn của user là rủi ro, nhưng cuối cùng phải tôn trọng quyết định của user |

## 4. Triết lý học tập

**User không học công nghệ. User học để đạt mục tiêu.**

| Sai | Đúng |
|---|---|
| "Học NodeJS" | "Xây dựng web dịch lồng tiếng video" |

AI chịu trách nhiệm tự suy luận:
- Cần học gì (which concepts).
- Học theo thứ tự nào (dependency).
- Học sâu tới đâu (depth — xem Knowledge Philosophy, mục 6).

Đây là lý do Roadmap không thể sinh sẵn toàn bộ ngay từ đầu — vì việc suy luận "cần học gì tiếp theo" phụ thuộc vào tiến trình thực tế của người học, không chỉ vào mục tiêu ban đầu.

## 5. Roadmap như tài liệu sống

Roadmap mở rộng động theo nhu cầu khám phá của người học, không phải cây quyết định cố định sinh một lần.

```
Goal
├── Backend
├── Frontend
├── AI
└── Deployment

→ mở Backend →

Backend
├── API
├── Database
├── Authentication

→ mở Authentication →

Authentication
├── Session
├── JWT
├── OAuth
```

**Roadmap Governance** (ranh giới quyền lực AI ↔ User):

| AI được phép | AI KHÔNG được phép |
|---|---|
| Đề xuất module/thứ tự mới | Tự thêm module |
| Cảnh báo rủi ro lựa chọn | Tự bỏ module |
| Phản biện quyết định của user | Tự đổi thứ tự |
| | Tự sửa roadmap |

Mọi thay đổi roadmap phải qua phê duyệt của user.

## 6. Knowledge Philosophy

Hoàn thành task không có nghĩa là hiểu. Hệ thống đo 4 cấp độ trên từng concept:

| Cấp độ | Ý nghĩa |
|---|---|
| Remember | Nhớ được khái niệm/cú pháp |
| Explain | Giải thích lại được bằng lời của mình |
| Apply | Áp dụng được vào tình huống thực tế |
| Teach | Dạy lại được cho người khác / bảo vệ được lựa chọn thiết kế |

Một concept chỉ **mastered** khi đạt đủ các cấp độ phù hợp với mục tiêu học (không phải concept nào cũng cần đạt Teach).

## 7. Knowledge Graph

Là thành phần trung tâm của hệ thống — không phải tính năng phụ. Hệ thống không lưu "đã học X" (boolean), mà lưu theo từng concept:

```
JWT
├── Remember:  [trạng thái]
├── Explain:   [trạng thái]
├── Apply:     [trạng thái]
├── Teach:     [trạng thái]
├── Evidence:  [bằng chứng — bài làm, câu trả lời, debug session...]
├── Confidence:[độ tin cậy của đánh giá]
└── Mastery Score
```

## 8. Discovery Engine

Discovery không phải khảo sát một lần — là quá trình đánh giá động, diễn ra liên tục:

- **Mục tiêu thật**: AI phải hiểu user muốn gì, không chỉ ghi nhận câu trả lời nghĩa đen.
- **Trình độ thực tế**: AI phải đánh giá được năng lực thật, không chỉ dựa vào tự khai.
- **SelfAssessmentMismatch**: khi user tự nhận "tôi biết X" nhưng hành vi/kết quả thực tế cho thấy khác, hệ thống phải ghi nhận sai lệch này một cách rõ ràng (không phải chỉ điều chỉnh ngầm). Cơ chế xác minh cụ thể: 🔶 OPEN — xem [OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 5.
- **Continuous Discovery**: discovery không kết thúc sau onboarding — tiếp diễn suốt vòng đời học của user.

## 9. Learning Modes

| Mode | Tên | Đặc điểm |
|---|---|---|
| A | Explain | AI giải thích trực tiếp |
| B | Explain + Verify | AI giải thích, sau đó kiểm tra hiểu |
| C | Socratic | AI dẫn dắt bằng câu hỏi, không giải thích trực tiếp |
| D | Mentor | AI đóng vai mentor toàn diện — kết hợp các mode khi cần |

User chuyển mode bất kỳ lúc nào.

## 10. User Memory

Hệ thống ghi nhớ liên tục: goal hiện tại, goal cũ, roadmap cũ, điểm mạnh, điểm yếu, lỗi thường gặp, kiến thức đã học, mức độ hiểu. User có quyền xem hồ sơ tri thức của chính mình bất kỳ lúc nào.

## 11. Phạm vi (Scope)

Không giới hạn ở Software Engineering. Phải hỗ trợ: Lập trình, AI, Thiết kế, Ngoại ngữ, Marketing, Kinh doanh, Kỹ năng nghề nghiệp.

Mức độ MVP cần hỗ trợ bao nhiêu lĩnh vực trong số này: 🔶 OPEN — xem [OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 3.

## 12. Trải nghiệm mong muốn (North Star)

- "Nó hiểu tôi."
- "Nó dạy tôi như một senior riêng."
- "Nó giúp tôi không bị lạc hướng."
- "Nó khiến tôi thật sự hiểu."
- "Nó giúp tôi tự xây được sản phẩm."

Mọi quyết định thiết kế nên được kiểm tra lại bằng 5 câu này: nếu một tính năng không đóng góp vào ít nhất một câu, nó có thể không thuộc về sản phẩm này.
