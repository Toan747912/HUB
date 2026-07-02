# DECISION-033 — Adaptive Pause (No Fixed Threshold)

- **Status:** Accepted (Locked) — resolves Open Question #24
- **Date:** 2026-06-27 (Round 6 / Pre-Database Review)

## Context

[LearningSessionDomain.md](../03_Domain_Model/LearningSessionDomain.md) (Round 5) để mở câu hỏi về ngưỡng thời gian không hoạt động cụ thể để tự động chuyển `LearningSession` sang `Paused` — xem [OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 24.

## Decision

**Auto Pause không dùng ngưỡng cố định** (không có hằng số "N giờ/ngày không hoạt động → tự Paused").

Thay vào đó:
- **Recommendation Engine có thể đề xuất pause** — dựa trên tổng hợp tín hiệu hiện có của nó (tương tự cách nó đề xuất hành động khác, theo [DECISION-019](DECISION-019-Recommendation-Engine.md)), không phải một cơ chế riêng biệt.
- **Learner xác nhận cuối cùng** — đề xuất pause không tự thực thi; `LearningSession` chỉ chuyển sang `Paused` khi Learner xác nhận, đúng theo Human Control Boundary đã chốt ("AI đề xuất, cần Learner xác nhận", [AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md) mục 3).

## Reasoning

Một ngưỡng thời gian cố định không phản ánh đúng sự khác biệt giữa Learner: người học đều, người học ngắt quãng theo lịch riêng đều có thể bị gắn nhãn "Paused" sai nếu dùng 1 hằng số chung — đây là vấn đề cá nhân hóa giống các quyết định ngưỡng khác đã từng bị bác (ví dụ DECISION-021 bác đề xuất "lặp lại ≥2 lần" cho Regression, chọn Evidence Weight thay vì đếm số lượng). Giao việc phát hiện tín hiệu "có thể nên pause" cho Recommendation Engine (đã có cơ chế tổng hợp tín hiệu) tránh tạo thêm 1 cơ chế ngưỡng riêng biệt thứ hai trong hệ thống, và giữ đúng nguyên tắc đã thiết lập: AI không tự thực thi thay đổi trạng thái quan trọng mà không có Learner xác nhận.

## Consequences

- **Đóng Open Question #24.** Không cần thêm hằng số/cấu hình ngưỡng thời gian cho Pause tự động.
- `LearningSessionPaused` (Domain Event, [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md)) chỉ phát sinh từ 1 trong 2 nguồn: (a) Learner tự bấm pause trực tiếp (không đổi, đã có ở Round 5), hoặc (b) Learner xác nhận một `RecommendationProposal` loại "pause" do Recommendation Engine đề xuất (mới).
- `RecommendationProposal` cần hỗ trợ thêm loại đề xuất "pause this Learning Session" — không phải loại hành động hoàn toàn mới về cấu trúc (vẫn đi qua `RecommendationProposed` kèm `traced_to[]` theo DECISION-027), chỉ là thêm 1 giá trị cho action type.
- Human Control Boundary table ([AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md) mục 3) cần thêm dòng: đề xuất Pause thuộc nhóm "AI đề xuất, cần Learner xác nhận" — không thuộc nhóm "AI tự làm".
- State Model của `LearningSession` ([LearningSessionDomain.md](../03_Domain_Model/LearningSessionDomain.md)) cần sửa lại transition Active→Paused: không còn nhãn "timeout" tự động, thay bằng "manual hoặc Recommendation + Learner confirm".

## Related Documents

- [DECISION-019-Recommendation-Engine](DECISION-019-Recommendation-Engine.md)
- [DECISION-021-Evidence-Weighting](DECISION-021-Evidence-Weighting.md)
- [DECISION-028-Learning-Session-Domain](DECISION-028-Learning-Session-Domain.md)
- [Docs/03_Domain_Model/LearningSessionDomain.md](../03_Domain_Model/LearningSessionDomain.md)
- [Docs/01_PRD/OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 24
