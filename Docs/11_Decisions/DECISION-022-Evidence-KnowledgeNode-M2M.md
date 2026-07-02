# DECISION-022 — Evidence ↔ KnowledgeNode Many-to-Many

- **Status:** Accepted (Locked) — resolves Open Question #11
- **Date:** 2026-06-27 (Round 3)

## Context

Round 2's [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) giả định 1 Evidence có thể gắn nhiều Knowledge Node, nhưng đánh dấu 🔶 OPEN vì chưa được Founder xác nhận trực tiếp.

## Decision

**Evidence và KnowledgeNode có quan hệ Many-to-Many** — xác nhận giả định của Claude là đúng, và mở rộng thêm: **một Evidence có thể hỗ trợ (support) hoặc phản bác (refute) nhiều Knowledge Node cùng lúc**, không chỉ "liên quan tới" nhiều node theo cùng 1 chiều.

## Reasoning

Một tương tác thực tế (ví dụ 1 bài nộp project) thường chứng minh hiểu đúng phần này, hiểu sai phần khác trong cùng 1 lượt — ví dụ submission "Upload Video" có thể support "HTTP" nhưng đồng thời refute "Multipart Form" nếu phần xử lý multipart bị lỗi. Mô hình cũ ngầm định 1 Evidence có 1 `type` (Positive/Negative) áp dụng đồng nhất cho mọi node liên quan — không còn đúng.

## Consequences

- **Thay đổi cấu trúc Evidence:** chiều support/refute không còn là 1 field `type` cấp Evidence — phải chuyển thành thuộc tính của **từng liên kết** Evidence↔KnowledgeNode (gọi là `EvidenceLink`). Mỗi `EvidenceLink` có chiều riêng (support/refute) + Weight riêng (theo DECISION-021).
- `Evidence` aggregate giờ sở hữu `EvidenceLink[]` (1 Evidence → nhiều EvidenceLink → nhiều KnowledgeNode), không còn field `target_knowledge_nodes[]` đơn giản.
- [AI/EvidenceEngine/EvidenceModel.md](../../AI/EvidenceEngine/EvidenceModel.md), [Docs/03_Domain_Model/CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) cần cập nhật theo cấu trúc `EvidenceLink` này.
- 🔶 OPEN — thuật ngữ "Positive Evidence"/"Negative Evidence" (DECISION-016) giờ có nghĩa **per-link** (support/refute), không phải tính chất toàn cục của 1 Evidence — cần xác nhận đây có thay thế hoàn toàn 2 khái niệm cũ, hay 2 khái niệm cũ vẫn tồn tại ở mức tổng quát (ví dụ 1 Evidence "chủ yếu Positive" nếu đa số EvidenceLink là support)?

## Related Documents

- [DECISION-016-Evidence-Based-Decay](DECISION-016-Evidence-Based-Decay.md)
- [DECISION-021-Evidence-Weighting](DECISION-021-Evidence-Weighting.md)
- [AI/EvidenceEngine/EvidenceModel.md](../../AI/EvidenceEngine/EvidenceModel.md)
- [Docs/03_Domain_Model/CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md)
