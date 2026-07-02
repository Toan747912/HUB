# DECISION-030 — Assessment Result Granularity

- **Status:** Accepted (Locked) — chốt nội dung bắt buộc của `AssessmentResult`; **không tự đóng** Open Question #20 (xem mục Reasoning)
- **Date:** 2026-06-27 (Round 5)

## Context

[DECISION-026](DECISION-026-Assessment-Core-Domain.md) (Round 4) xác định `AssessmentResult` là entity bắt buộc mỗi lượt đánh giá, nhưng chỉ phác thảo nội dung sơ bộ (`verdict`, `reasoning`). [AssessmentDomain.md](../03_Domain_Model/AssessmentDomain.md) để `verdict` ở dạng "Remember/Explain/Apply: pass/fail; Teach: contribution vào teach_score" — vẫn gần với mô hình Pass/Fail rời rạc, chưa đủ chi tiết để hỗ trợ Explainability First ở mức từng quyết định.

## Decision

Mỗi `AssessmentResult` **phải chứa đủ các trường sau**:

| Trường | Ý nghĩa |
|---|---|
| `KnowledgeNode` | Node đang được đánh giá (tham chiếu, không nhân bản định nghĩa) |
| `Remember` | Trạng thái/mức độ đạt được ở cấp độ Remember tại thời điểm đánh giá này |
| `Explain` | Trạng thái/mức độ đạt được ở cấp độ Explain |
| `Apply` | Trạng thái/mức độ đạt được ở cấp độ Apply |
| `Teach` | Trạng thái/mức độ đạt được ở cấp độ Teach (composite, theo DECISION-020) |
| `Confidence` | Mức độ tin cậy của chính đánh giá này (AI tự đánh giá độ chắc chắn của kết luận, không phải mức độ hiểu của Learner) |
| `Evidence References` | Danh sách tham chiếu cụ thể tới `Evidence`/`EvidenceLink` đã dùng để ra kết luận này |
| `Reasoning` | Giải thích bằng ngôn ngữ tự nhiên cho kết luận |

**Không sử dụng Pass/Fail đơn thuần.** **Không sử dụng điểm số đơn thuần.** Cấu trúc trên **phải hỗ trợ Explainability First** ([DECISION-027](DECISION-027-Explainability-First.md)) — `Evidence References` + `Reasoning` không phải trường tùy chọn, là bắt buộc trên mọi `AssessmentResult`.

## Reasoning

Pass/Fail hoặc điểm số đơn thuần xóa mất thông tin **vì sao** — không đủ để trả lời "AI dựa vào đâu để nói Learner đã hiểu/chưa hiểu node này", vi phạm trực tiếp DECISION-027. Đưa đủ 4 cấp độ (Remember/Explain/Apply/Teach) vào **mỗi** `AssessmentResult`, thay vì chỉ trường `verdict` đơn cho 1 cấp độ đang được test, vì một lượt đánh giá thường hé lộ thông tin về nhiều cấp độ cùng lúc (ví dụ: 1 câu trả lời sai ở Apply có thể đồng thời xác nhận Remember/Explain vẫn tốt) — giữ snapshot đầy đủ giúp truy vết lịch sử thay đổi mastery dễ hơn là chỉ lưu delta của 1 chiều.

**Quan hệ với Open Question #20:** Câu 20 hỏi về **cardinality** — 1 `Evidence` (có thể có nhiều `EvidenceLink`) sinh ra 1 `AssessmentResult` duy nhất hay nhiều (1 per `EvidenceLink`). DECISION-030 trả lời một câu hỏi khác — **nội dung mỗi `AssessmentResult` phải chứa gì** — và áp dụng như nhau cho cả 2 phương án cardinality. **Câu 20 vẫn còn mở**, chỉ thu hẹp lại: dù chọn phương án nào, mỗi record vẫn phải có đủ 8 trường trên.

## Consequences

- [AssessmentDomain.md](../03_Domain_Model/AssessmentDomain.md) mục Outputs cần viết lại định nghĩa `AssessmentResult` theo cấu trúc 8 trường này, thay cho mô tả "verdict" cũ.
- `KnowledgeNodeMastery` (entity riêng, vẫn write-owner bởi Assessment) tiếp tục là **trạng thái tích lũy hiện tại** — `AssessmentResult` là **lịch sử immutable từng lượt đánh giá**; 2 entity không trùng lặp vai trò, `KnowledgeNodeMastery` có thể được tính/suy ra từ `AssessmentResult` gần nhất hoặc tổng hợp nhiều `AssessmentResult` (công thức tổng hợp cụ thể: 🔶 vẫn là Gap 5, chưa chốt).
- Schema `assessment_results` (khi vào Database Design) cần ít nhất 8 cột/quan hệ tương ứng — không ảnh hưởng việc bảng có tồn tại được hay không (đã ✅ ở Round 4), nhưng thu hẹp thiết kế cột.
- Field `Confidence` là khái niệm mới (độ tin cậy của AI, không phải của Learner) — cần làm rõ thêm ở [LearningSessionDomain.md](../03_Domain_Model/LearningSessionDomain.md)/`AssessmentDomain.md` rằng đây không phải cùng khái niệm với mastery level.

## Related Documents

- [DECISION-020-Teach-Composite-Capability](DECISION-020-Teach-Composite-Capability.md)
- [DECISION-026-Assessment-Core-Domain](DECISION-026-Assessment-Core-Domain.md)
- [DECISION-027-Explainability-First](DECISION-027-Explainability-First.md)
- [Docs/03_Domain_Model/AssessmentDomain.md](../03_Domain_Model/AssessmentDomain.md)
- [Docs/01_PRD/OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 20 (vẫn mở, đã thu hẹp)
