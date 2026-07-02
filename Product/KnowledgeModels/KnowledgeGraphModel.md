# Knowledge Graph Model — Reference

> Trích xuất/tổng hợp từ [DECISION-010](../../Docs/11_Decisions/DECISION-010-Knowledge-Graph.md) và [Docs/03_Domain_Model/DomainModel_Draft.md](../../Docs/03_Domain_Model/DomainModel_Draft.md). Tài liệu này là điểm tham chiếu vận hành cho KnowledgeEngine, không lặp lại toàn bộ Domain Model.
>
> **Cập nhật Round 2:** [DECISION-015](../../Docs/11_Decisions/DECISION-015-Knowledge-Engine.md), [DECISION-016](../../Docs/11_Decisions/DECISION-016-Evidence-Based-Decay.md), [DECISION-017](../../Docs/11_Decisions/DECISION-017-Mastery-Framework.md) đã elaborate đáng kể mô hình dưới đây (Knowledge Node có cấu trúc con, decay theo evidence, Teach là cluster). Bản chi tiết/đang dùng để implement: [AI/KnowledgeEngine/](../../AI/KnowledgeEngine/KnowledgeEngine.md). Nội dung dưới đây giữ nguyên làm tham chiếu lịch sử mức DECISION-010, không tự sửa để tránh 2 nguồn lệch nhau.
>
> **Cập nhật Round 3:** [DECISION-024](../../Docs/11_Decisions/DECISION-024-Concept-Is-KnowledgeNode.md) xác nhận chính thức "Concept" trong diagram dưới đây = `KnowledgeNode`. [DECISION-020](../../Docs/11_Decisions/DECISION-020-Teach-Composite-Capability.md) đổi `Teach` thành weighted score (không còn 1 `<trạng thái>` đơn giản như diagram dưới ghi). [DECISION-022](../../Docs/11_Decisions/DECISION-022-Evidence-KnowledgeNode-M2M.md) đổi `Evidence` thành quan hệ qua `EvidenceLink`. Diagram dưới **vẫn giữ nguyên dạng Round 1** có chủ đích (tham chiếu lịch sử) — bản đang dùng để implement luôn là [AI/KnowledgeEngine/MasteryModel.md](../../AI/KnowledgeEngine/MasteryModel.md).

## Cấu trúc 1 node trong Knowledge Graph (theo Learner)

```
Concept: <tên concept>
├── Remember:      <trạng thái>
├── Explain:       <trạng thái>
├── Apply:         <trạng thái>
├── Teach:         <trạng thái>
├── Evidence:      [tham chiếu MentorSession/Submission đã đóng góp]
├── Confidence:     <độ tin cậy — kiểu dữ liệu 🔶 chờ Architecture>
└── MasteryScore:   <tổng hợp 4 cấp độ — công thức 🔶 chờ Architecture>
```

## Nguyên tắc bất biến

- Lưu theo **Concept**, không lưu theo Lesson/RoadmapNode — 1 Concept có thể được học lại qua nhiều Lesson khác nhau (ví dụ remediation), tất cả cùng đóng góp Evidence cho 1 ConceptMastery duy nhất.
- Không có flag boolean "đã học" — mọi truy vấn trạng thái phải đi qua 4 cấp độ + Evidence.
- LearningProfile không phải nguồn dữ liệu — là view tính toán từ ConceptMastery.

## Còn mở (chưa chốt ở mức implementation)

- Kiểu dữ liệu Confidence/MasteryScore — Gap 5.
- DomainAssessmentMapping cho lĩnh vực ngoài lập trình — Gap 2.

Theo dõi trạng thái 2 gap này tại [Docs/10_Backlog/Backlog.md](../../Docs/10_Backlog/Backlog.md).
