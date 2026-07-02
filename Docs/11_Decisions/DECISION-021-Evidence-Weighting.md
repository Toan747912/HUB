# DECISION-021 — Knowledge Regression Based on Evidence Weight

- **Status:** Accepted (Locked) — refines [DECISION-016](DECISION-016-Evidence-Based-Decay.md), resolves Open Question #10
- **Date:** 2026-06-27 (Round 3)

## Context

DECISION-016 (Round 2) để ngỏ ngưỡng kích hoạt Knowledge Regression: 1 Negative Evidence đơn lẻ có đủ hay cần tích lũy? Claude đề xuất sơ bộ "cần lặp lại ≥2 lần" tại [AI/EvidenceEngine/NegativeEvidence.md](../../AI/EvidenceEngine/NegativeEvidence.md) — Founder/Lead Architect chọn hướng khác.

## Decision

Knowledge Regression dựa trên **Evidence Weight** — **không dựa trên số lượng** Negative Evidence đơn thuần (bác bỏ đề xuất "đếm số lần" của Claude ở Round 2).

## Reasoning

Đếm số lượng coi mọi evidence ngang giá trị nhau — sai, vì 1 evidence "rõ ràng, nhiều chi tiết" (ví dụ giải thích sai toàn bộ nguyên lý) đáng tin hơn 1 evidence "mơ hồ" (ví dụ trả lời ngắn, có thể do hiểu nhầm câu hỏi, không phải hiểu nhầm khái niệm). Evidence Weight cho phép 1 evidence đủ mạnh trigger Regression ngay, hoặc nhiều evidence yếu cộng lại mới đủ — linh hoạt hơn ngưỡng đếm cứng.

## Consequences

- `Evidence` cần thêm thuộc tính **Weight** (kiểu dữ liệu/công thức tính cụ thể: 🔶 OPEN, đây là phần mở rộng mới của Gap 5).
- Knowledge Regression được trigger khi **tổng Evidence Weight** (theo hướng Negative, trừ/bù với Positive nếu có) vượt một ngưỡng — không phải khi đếm đủ N evidence. Ngưỡng cụ thể vẫn 🔶 OPEN.
- [AI/EvidenceEngine/NegativeEvidence.md](../../AI/EvidenceEngine/NegativeEvidence.md) cần cập nhật: xóa đề xuất "lặp lại ≥2 lần", thay bằng mô hình Evidence Weight.
- Ai/cái gì quyết định Weight của 1 evidence cụ thể (do AI tự đánh giá theo từng tình huống, hay theo bảng quy tắc cố định theo loại evidence)? 🔶 OPEN mới.

## Related Documents

- [DECISION-016-Evidence-Based-Decay](DECISION-016-Evidence-Based-Decay.md)
- [DECISION-022-Evidence-KnowledgeNode-M2M](DECISION-022-Evidence-KnowledgeNode-M2M.md)
- [AI/EvidenceEngine/NegativeEvidence.md](../../AI/EvidenceEngine/NegativeEvidence.md)
- [AI/EvidenceEngine/EvidenceModel.md](../../AI/EvidenceEngine/EvidenceModel.md)
