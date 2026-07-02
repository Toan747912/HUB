# Positive Evidence

> Theo [DECISION-016](../../Docs/11_Decisions/DECISION-016-Evidence-Based-Decay.md), **[DECISION-022](../../Docs/11_Decisions/DECISION-022-Evidence-KnowledgeNode-M2M.md) (Round 3)**.

## Định nghĩa

Round 3: "Positive Evidence" giờ tương ứng với 1 `EvidenceLink` có `direction = support` (xem [EvidenceModel.md](EvidenceModel.md)) — không còn là tính chất toàn cục của cả 1 Evidence.

Bằng chứng cho thấy Learner hiểu đúng một Knowledge Node ở một cấp độ/sub-capability cụ thể.

## Ví dụ (từ brief gốc)

- Trả lời đúng (Remember/Explain).
- Làm task đúng (Apply).
- Giải thích đúng (Explain Level 2, hoặc Teach.Explain nếu giải thích cho người khác).
- Code đúng (Apply, hoặc Teach.Review nếu là review code người khác).

## Vai trò trong Mastery Update

Positive Evidence là điều kiện **cần nhưng có thể chưa đủ** để nâng cấp trạng thái Mastery — số lượng/độ đa dạng evidence cần thiết để chính thức nâng cấp 1 cấp độ vẫn thuộc Gap 5 (công thức Mastery Score), chưa được quyết định trong Round 2 này.

## Không tự động làm

- Không tự động đảo ngược một Knowledge Regression đã ghi nhận trước đó chỉ vì có 1 Positive Evidence mới — cơ chế "phục hồi sau regression" chưa được brief đề cập, ghi nhận là điểm cần hỏi thêm nếu Founder thấy cần (chưa đưa vào Open Questions chính thức vì chưa chắc là vấn đề cấp thiết cho giai đoạn Domain Modeling hiện tại).
