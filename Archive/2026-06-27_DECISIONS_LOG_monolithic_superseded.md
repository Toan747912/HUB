> **SUPERSEDED 2026-06-27** — Sau khi workspace được tái cấu trúc theo mô hình phân tầng, toàn bộ nội dung dưới đây đã được tách thành các file quyết định riêng (atomic) tại `Docs/11_Decisions/DECISION-001..014-*.md`. File này được giữ lại trong Archive chỉ để tham khảo lịch sử — **không còn là nguồn sự thật**. Nguồn sự thật hiện tại là `Docs/11_Decisions/`.

# Decisions Log — AI Mentor OS (bản gốc, đã thay thế)

Sổ quyết định đã khóa. Đây là nguồn sự thật duy nhất cho mọi quyết định đã được Founder phê duyệt. Chỉ thêm (append), không sửa/xóa nội dung cũ trừ khi có yêu cầu mở khóa rõ ràng từ Founder.

## ENTRY 0 — Khởi tạo dự án (LOCKED)

**Ngày:** 2026-06-27

**Bối cảnh:** Founder khởi tạo dự án "AI Mentor OS" với brief đầy đủ về tầm nhìn, nguyên tắc, triết lý học tập, roadmap system, discovery engine, learning modes, knowledge philosophy, knowledge graph, user memory, scope, và phân quyền vai trò.

**Quyết định đã khóa:**

1. **Tên dự án:** AI Mentor OS.
2. **Định vị sản phẩm:** AI Apprenticeship Platform. KHÔNG phải LMS, KHÔNG phải nền tảng khóa học, KHÔNG phải FreeCodeCamp clone, KHÔNG phải ChatGPT wrapper.
3. **Vai trò AI:** Senior Engineer / Mentor cá nhân hóa.
4. **Mục tiêu sản phẩm:** giúp người học (a) hoàn thành mục tiêu thực tế, (b) thực sự hiểu kiến thức, (c) có thể tự xây sản phẩm tương tự mà không phụ thuộc AI.
5. **7 nguyên tắc cốt lõi:**
   - Không học vẹt.
   - Hiểu quan trọng hơn hoàn thành.
   - Mọi kiến thức phải gắn với mục tiêu thực tế.
   - AI phải thích nghi theo từng người học.
   - User luôn là người quyết định cuối cùng.
   - Không để user bị kẹt quá lâu.
   - AI được phản biện nhưng không được ép buộc.
6. **Triết lý học tập:** User không học công nghệ, user học để đạt mục tiêu (ví dụ: "Xây dựng web dịch lồng tiếng video", không phải "Học NodeJS"). AI tự suy luận cần học gì, theo thứ tự nào, học sâu tới đâu.
7. **Roadmap System:**
   - Roadmap là tài liệu sống.
   - Roadmap KHÔNG được tạo chi tiết toàn bộ ngay từ đầu — mở rộng động theo nhu cầu (ví dụ: Goal → Backend/Frontend/AI/Deployment → mở Backend → API/Database/Authentication → mở Authentication → Session/JWT/OAuth).
8. **Roadmap Governance:**
   - AI có thể: đề xuất, cảnh báo, phản biện.
   - AI KHÔNG được tự ý: thêm module, bỏ module, đổi thứ tự, sửa roadmap.
   - Mọi thay đổi roadmap phải được user phê duyệt.
9. **Discovery Engine:**
   - Không phải form khảo sát cố định — là quá trình đánh giá động (Adaptive Discovery).
   - Mục tiêu: hiểu mục tiêu thật của user, đánh giá trình độ thực tế, phát hiện sai lệch giữa tự đánh giá và năng lực thực tế.
   - Khái niệm **SelfAssessmentMismatch**: AI phải ghi nhận khi tự đánh giá ≠ năng lực thực tế (ví dụ: user nói "Tôi biết Docker" — AI cần cơ chế xác minh).
   - Khái niệm **Continuous Discovery**: discovery tiếp tục diễn ra trong suốt quá trình học, không chỉ ở onboarding.
10. **Learning Modes:** 4 mode — A (Explain), B (Explain + Verify), C (Socratic), D (Mentor). User được chuyển mode bất kỳ lúc nào.
11. **Knowledge Philosophy:** Hoàn thành task ≠ hiểu. Hệ thống đo 4 cấp độ: Remember, Explain, Apply, Teach. Một kiến thức chỉ được coi là mastered khi đạt đủ các cấp độ phù hợp.
12. **Knowledge Graph:** Thành phần trung tâm của hệ thống. Không lưu "đã học JWT", mà lưu theo concept: Remember/Explain/Apply/Teach + Evidence + Confidence + Mastery Score.
13. **User Memory:** Hệ thống phải nhớ goal hiện tại, goal cũ, roadmap cũ, điểm mạnh, điểm yếu, lỗi thường gặp, kiến thức đã học, mức độ hiểu. User có quyền xem hồ sơ tri thức của mình.
14. **Scope đa lĩnh vực:** Không chỉ Software Engineering. Hệ thống phải hỗ trợ: Lập trình, AI, Thiết kế, Ngoại ngữ, Marketing, Kinh doanh, Kỹ năng nghề nghiệp.
15. **Trải nghiệm mong muốn:** "Nó hiểu tôi" / "Nó dạy tôi như một senior riêng" / "Nó giúp tôi không bị lạc hướng" / "Nó khiến tôi thật sự hiểu" / "Nó giúp tôi tự xây được sản phẩm".
16. **Phân quyền:** Founder (User) = quyết định cuối cùng. ChatGPT = Lead Architect (dẫn dắt kiến trúc sản phẩm). Claude = Co-Architect / Documentation Manager / Requirements Analyst — không phải người ra quyết định cuối cùng, không được tự ý thêm/bỏ/đổi thứ tự/sửa roadmap hoặc các quyết định đã khóa khác.

**Trạng thái:** LOCKED. Mọi tài liệu workspace từ đây phải tuân thủ Entry này, không được mâu thuẫn ngầm.
