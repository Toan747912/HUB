# Negative Evidence

> Theo [DECISION-016](../../Docs/11_Decisions/DECISION-016-Evidence-Based-Decay.md), **[DECISION-021](../../Docs/11_Decisions/DECISION-021-Evidence-Weighting.md) (Round 3)**.

## Định nghĩa

Round 3: "Negative Evidence" giờ tương ứng với 1 `EvidenceLink` có `direction = refute` (xem [EvidenceModel.md](EvidenceModel.md)) — không còn là tính chất toàn cục của cả 1 Evidence, vì 1 Evidence có thể vừa support node này vừa refute node khác (DECISION-022).

Bằng chứng cho thấy Learner hiểu sai hoặc đã quên một Knowledge Node ở một cấp độ/sub-capability đã từng (hoặc đang) được ghi nhận.

## Ví dụ (từ brief gốc)

- Giải thích sai.
- Áp dụng sai.
- Lặp lại lỗi cũ.
- Hiểu nhầm khái niệm.

## Vai trò trong Mastery Update — Knowledge Regression

**Đã đóng ở Round 3 ([DECISION-021](../../Docs/11_Decisions/DECISION-021-Evidence-Weighting.md)):** Knowledge Regression không còn dựa trên việc đếm số lượng Negative Evidence/EvidenceLink. Đề xuất "lặp lại ≥2 lần" của Claude ở Round 2 đã bị **bác bỏ rõ ràng** bởi Founder/Lead Architect.

Cơ chế chính thức: Knowledge Regression trigger khi **tổng Evidence Weight** theo chiều `refute` (có thể trừ/bù với `support` cùng kỳ) vượt một ngưỡng.

**Đổi Round 4 ([DECISION-026](../../Docs/11_Decisions/DECISION-026-Assessment-Core-Domain.md)):** quyết định "tổng weight vượt ngưỡng → trigger Regression" **không còn thuộc Evidence Engine** — Evidence Engine (bài viết này) chỉ cung cấp `evidence_weight` per `EvidenceLink`. Việc tổng hợp và quyết định Regression là của **Assessment Engine**, xem [AssessmentDomain.md](../../Docs/03_Domain_Model/AssessmentDomain.md).

🔶 OPEN — công thức tổng hợp Weight cụ thể và ngưỡng trigger vẫn chưa quyết định (xem [EvidenceModel.md](EvidenceModel.md) mục Còn mở).

## Minh bạch bắt buộc

Mọi Knowledge Regression phải đi kèm lý do hiển thị cho Learner (evidence cụ thể nào dẫn tới regression) — không phải một số điểm tụt xuống không giải thích, theo nguyên tắc minh bạch chung của AI Architecture.
