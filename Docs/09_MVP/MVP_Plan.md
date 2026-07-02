# MVP Plan — AI Mentor OS

> Trạng thái: Draft. Một số quyết định ưu tiên dưới đây là **đề xuất** của Claude, cần Founder/ChatGPT phê duyệt trước khi coi là kế hoạch chính thức.

## 1. Mục tiêu MVP

Chứng minh được 3 cơ chế lõi tạo nên khác biệt của AI Mentor OS (không phải chỉ "AI trả lời câu hỏi học tập"):

1. Roadmap mở rộng động + Roadmap Governance (đề xuất/phê duyệt) hoạt động thật, không phải mock.
2. Knowledge Graph theo 4 cấp độ (Remember/Explain/Apply/Teach) cập nhật được từ tương tác thật, không phải gắn nhãn tay.
3. Discovery Engine phát hiện được ít nhất một loại SelfAssessmentMismatch thật trong dữ liệu thử nghiệm.

Nếu 3 điều trên chưa chạy được thật, sản phẩm chưa khác gì một chatbot có giao diện đẹp — chưa nên mở rộng thêm lĩnh vực hay tính năng khác.

## 2. Đề xuất phạm vi lĩnh vực cho MVP

🔶 OPEN — phụ thuộc xác nhận của Founder ([OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 3).

**Đề xuất (chưa phải quyết định):** chỉ 1 lĩnh vực — Lập trình (Software Engineering) — vì:
- Có thể kiểm tra Apply (code chạy được) và một phần Teach (giải thích lựa chọn) bằng cơ chế tương đối khách quan.
- Founder và Claude đều có ngữ cảnh kỹ thuật sâu nhất ở lĩnh vực này để đánh giá chất lượng AI mentor thật.
- Tránh rủi ro Gap 2 ([RequirementGaps.md](../01_PRD/RequirementGaps.md)) — chưa cần giải Assessment Mapping cho 6 lĩnh vực cùng lúc.

## 3. Phạm vi tính năng MVP

### Trong phạm vi
- UC1 Onboarding/Discovery (Adaptive, không form cố định).
- UC2 + UC3: Roadmap cấp cao + mở rộng động (drill-down), có Roadmap Governance thật (ApprovalRecord).
- UC4: Học 1 Concept với ít nhất 2 Learning Mode (đề xuất: A-Explain và C-Socratic trước, vì đây là 2 cực đối lập rõ nhất để kiểm chứng framework — B và D có thể là tổ hợp của 2 mode này).
- UC5: Verify hiểu, cập nhật ConceptMastery thật.
- UC7: Xem hồ sơ tri thức (LearningProfile) — ít nhất ở dạng văn bản, chưa cần biểu đồ.
- UC8: Continuous Discovery ở mức tối thiểu (phát hiện lại mismatch khi học, không cần phức tạp).

### Ngoài phạm vi MVP (loại có lý do, không phải bỏ quên)
- UC6 (Debug/Stuck Support) đầy đủ — vì cơ chế còn 🔶 OPEN (câu 6); MVP có thể dùng phiên bản tối giản (1 cấp hint duy nhất) để không chặn toàn bộ MVP, và mở rộng đầy đủ sau khi câu hỏi này được trả lời.
- Learning Mode B và D — là tổ hợp/biến thể của A và C, có thể thêm sau khi A/C đã validate.
- Toàn bộ lĩnh vực ngoài lập trình.
- Mô hình kinh doanh/pricing.
- Vai trò Admin/Curriculum Authoring riêng (nếu Founder muốn) — MVP giả định nội dung sinh động hoàn toàn bởi AI, không có CMS.

## 4. Giai đoạn (Phase) — đề xuất

| Phase | Nội dung | Điều kiện Done |
|---|---|---|
| 0 — Nền tảng | Domain Model thật (DB), Identity, Goal/Roadmap CRUD cơ bản chưa có AI | Learner tạo được Goal, thấy Roadmap rỗng |
| 1 — Discovery | Capability Goal Clarification + Competency Probing | Phát hiện được ít nhất 1 SelfAssessmentMismatch thật trong test |
| 2 — Roadmap động | Roadmap Proposal + ApprovalRecord | Learner mở 1 nhánh, thấy nhánh con do AI đề xuất, phê duyệt được/từ chối được |
| 3 — Teaching + Mode A/C | Capability Teaching + Socratic Guidance | Learner học xong 1 Concept thật bằng cả 2 mode |
| 4 — Verify + Knowledge Graph | Capability Understanding Verification | ConceptMastery cập nhật đúng theo Evidence thật, không gắn tay |
| 5 — Knowledge Profile | UC7 | Learner xem được hồ sơ tri thức phản ánh đúng dữ liệu Phase 1-4 |

🔶 OPEN — số lượng Concept mẫu cần có sẵn để demo (cây Roadmap cần đủ sâu để thấy "mở rộng động" có ý nghĩa, không chỉ 1-2 node) — đề xuất tối thiểu 1 Goal mẫu với ít nhất 3 cấp độ phân nhánh, nhưng đây là ước lượng kỹ thuật, cần ChatGPT xác nhận khi vào giai đoạn implementation.

## 5. Rủi ro lớn nhất

- **Rủi ro thiết kế** (đã biết, xem [RequirementGaps.md](../01_PRD/RequirementGaps.md)): Gap 1 (ranh giới adaptive/governance) nếu không giải quyết trước Phase 2 sẽ làm Phase 2 không có specs rõ để build.
- **Rủi ro AI provider/chi phí**: chưa đánh giá — thuộc phạm vi ChatGPT (Lead Architect), không thuộc tài liệu Product/Requirements này.
