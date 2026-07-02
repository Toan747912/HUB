# DECISION-016 — Evidence-Based Decay

- **Status:** Accepted (Locked) — elaborates [DECISION-010](DECISION-010-Knowledge-Graph.md), resolves part of Gap 5
- **Date:** 2026-06-27 (Round 2)

## Context

DECISION-010 để ngỏ cách Mastery có thể giảm theo thời gian (Gap 5 trong RequirementGaps.md). Một thiết kế phổ biến nhưng được Founder/Lead Architect xác định là **sai** cho sản phẩm này: giảm điểm mastery chỉ vì thời gian trôi qua mà không dùng đến concept đó.

## Decision

**Không sử dụng Time Based Decay.**

Sai: *"6 tháng không dùng JWT → JWT giảm điểm."*

Đúng: **chỉ giảm mastery khi có bằng chứng (evidence) cho thấy Learner đã quên hoặc hiểu sai.**

Hai khái niệm mới:

- **Positive Evidence** — bằng chứng cho thấy hiểu đúng: trả lời đúng, làm task đúng, giải thích đúng, code đúng.
- **Negative Evidence** — bằng chứng cho thấy hiểu sai/quên: giải thích sai, áp dụng sai, lặp lại lỗi cũ, hiểu nhầm khái niệm.
- **Knowledge Regression** — khi bằng chứng mới cho thấy mức độ hiểu của Learner ở một Knowledge Node thấp hơn mức đã ghi nhận trước đó.

## Reasoning

Time-based decay trừng phạt Learner dựa trên giả định, không dựa trên hành vi thật — vi phạm trực tiếp tinh thần "đo được" của Knowledge Philosophy ([DECISION-009](DECISION-009-Knowledge-Philosophy.md)) và nguyên tắc minh bạch (mọi thay đổi mastery phải có lý do hiển thị được, không phải một bộ đếm thời gian âm thầm chạy ngầm).

## Consequences

- Cần một Capability/Engine chuyên thu thập và phân loại Evidence thành Positive/Negative — đây là phát hiện kiến trúc mới **Evidence Engine**, xem [AI/EvidenceEngine/](../../AI/EvidenceEngine/EvidenceEngine.md).
- `ConceptMastery`/`KnowledgeNodeMastery` không cần trường `last_used_at` để tính decay tự động.
- Gap 5 (công thức Mastery Score) vẫn **chưa đóng** — quyết định này chỉ khóa *nguyên tắc* (decay phải dựa trên evidence), không khóa công thức cụ thể (bao nhiêu Negative Evidence mới đủ để Regression, có cần ngưỡng hay 1 evidence là đủ). Xem Open Question mới trong [OpenQuestions.md](../01_PRD/OpenQuestions.md).

## Related Documents

- [DECISION-009-Knowledge-Philosophy](DECISION-009-Knowledge-Philosophy.md)
- [DECISION-010-Knowledge-Graph](DECISION-010-Knowledge-Graph.md)
- [DECISION-017-Mastery-Framework](DECISION-017-Mastery-Framework.md)
- [AI/EvidenceEngine/](../../AI/EvidenceEngine/EvidenceEngine.md)
- [Docs/01_PRD/RequirementGaps.md](../01_PRD/RequirementGaps.md) — Gap 5
