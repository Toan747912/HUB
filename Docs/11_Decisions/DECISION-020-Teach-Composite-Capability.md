# DECISION-020 — Teach as Composite Capability (Weighted Score, no Pass/Fail)

- **Status:** Accepted (Locked) — refines [DECISION-017](DECISION-017-Mastery-Framework.md), resolves Open Question #9
- **Date:** 2026-06-27 (Round 3)

## Context

DECISION-017 (Round 2) xác lập Teach là cluster 5 sub-capability nhưng để ngỏ điều kiện đạt Teach (5/5 hay ngưỡng N/5 — Open Question #9). Founder/Lead Architect quyết định: không dùng ngưỡng pass/fail rời rạc cho Teach.

## Decision

**Teach là Composite Capability**, đánh giá bằng **weighted capability score** — tổng hợp có trọng số từ 5 sub-capability (Explain/Simplify/Guide/Review/Transfer Knowledge), **không dùng Pass/Fail** cho Teach.

## Reasoning

Pass/Fail rời rạc (5/5 hay N/5) làm mất thông tin về *mức độ* — một Learner mạnh ở Explain+Simplify nhưng yếu Guide là khác hẳn một Learner yếu đều cả 5, nhưng cả hai có thể cùng "pass ngưỡng N/5" nếu dùng mô hình ngưỡng. Weighted score giữ được sắc thái này, phù hợp hơn với việc Teach là năng lực phức hợp.

## Consequences

- `KnowledgeNodeMastery.Teach` không còn là 1 trạng thái đạt/chưa đạt — là 1 điểm số tổng hợp từ 5 sub-capability, mỗi sub-capability có trọng số riêng (trọng số cụ thể: 🔶 OPEN, xem Open Question mới).
- **Mâu thuẫn cần lưu ý:** [Docs/05_Prompt_Architecture/PromptArchitecture_Draft.md](../05_Prompt_Architecture/PromptArchitecture_Draft.md) (Round 1) quy định Understanding Verification "không có trạng thái partial mơ hồ — mỗi cấp độ là đạt/chưa đạt rõ ràng". Quyết định này tạo **ngoại lệ rõ ràng cho Teach**: Remember/Explain(Level 2)/Apply tiếp tục đạt/chưa đạt rõ ràng (không đổi); chỉ Teach dùng weighted score. Cần cập nhật PromptArchitecture để ghi rõ ngoại lệ này, tránh đọc nhầm là mâu thuẫn không giải thích.
- Đặt tên: tránh nhầm "weight" ở đây (trọng số giữa 5 sub-capability của Teach) với "Evidence Weight" ở [DECISION-021](DECISION-021-Evidence-Weighting.md) (trọng số của 1 evidence) — 2 khái niệm khác nhau, cần tên field phân biệt (`capability_weight` vs `evidence_weight`).

## Related Documents

- [DECISION-009-Knowledge-Philosophy](DECISION-009-Knowledge-Philosophy.md)
- [DECISION-017-Mastery-Framework](DECISION-017-Mastery-Framework.md)
- [AI/KnowledgeEngine/MasteryModel.md](../../AI/KnowledgeEngine/MasteryModel.md)
- [Docs/05_Prompt_Architecture/PromptArchitecture_Draft.md](../05_Prompt_Architecture/PromptArchitecture_Draft.md)
