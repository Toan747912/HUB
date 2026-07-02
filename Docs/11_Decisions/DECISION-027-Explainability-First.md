# DECISION-027 — Explainability First

- **Status:** Accepted (Locked) — cross-cutting principle, áp dụng lên mọi Capability/Domain hiện có
- **Date:** 2026-06-27 (Round 4)

## Context

Qua các Round, hệ thống tích lũy nhiều cơ chế tự động (Knowledge Regression, Recommendation, Knowledge Expansion) — mỗi cơ chế đã có field `reasoning`/`expansion_reason` riêng lẻ, nhưng chưa có nguyên tắc xuyên suốt bắt buộc mọi quyết định phải truy vết được.

## Decision

**Explainability First.** Mọi thay đổi thuộc 3 nhóm sau đều phải truy vết được về nguồn Evidence và Assessment:
- Mastery (mọi thay đổi `KnowledgeNodeMastery`)
- Recommendation (`RecommendationProposal`)
- Knowledge Expansion (`KnowledgeNodeExpanded`, cả Local và Deep/Structural)

**Không cho phép black-box decision** — không có thay đổi nào trong 3 nhóm trên được tồn tại mà không có một chuỗi truy vết ngược về `Evidence`/`AssessmentResult` (hoặc `DiscoverySession` đối với Recommendation xuất phát từ SelfAssessmentMismatch).

## Reasoning

Đây là điều kiện kỹ thuật để thực thi North Star "Nó hiểu tôi" và nguyên tắc minh bạch đã có từ Round 1 (AI phải có lý do hiển thị được) — nhưng nâng từ "có lý do" (có thể là text tự do, khó kiểm tra) lên "có lý do **truy vết được bằng ID cụ thể**" (kiểm tra được, audit được).

## Consequences

- Mọi entity ghi nhận thay đổi (Domain Event hoặc record) phải có trường tham chiếu ngược: `source_evidence_id` / `source_assessment_result_id` / `source_discovery_session_id` — không chỉ `reasoning` dạng text.
- **Local Knowledge Expansion** (DECISION-023, hiện không yêu cầu hiển thị lý do cho Learner) **vẫn phải log lý do nội bộ truy vết được** — Explainability First không bắt buộc *hiển thị*, nhưng bắt buộc *truy vết được*. Đây là điểm cần làm rõ để không hiểu nhầm là mâu thuẫn với DECISION-023 (xem [ROUND4_DOMAIN_REVIEW.md](../03_Domain_Model/ROUND4_DOMAIN_REVIEW.md)).
- Output Envelope chung ([Docs/05_Prompt_Architecture/PromptArchitecture_Draft.md](../05_Prompt_Architecture/PromptArchitecture_Draft.md) mục 1) cần nâng cấp: `reasoning` không chỉ là text, mà phải kèm `traced_to[]` (danh sách ID nguồn).
- Đây là lý do trực tiếp dẫn tới việc `AssessmentResult` (DECISION-026) phải tồn tại như một entity riêng, được tham chiếu — không thể chỉ là 1 bước tính toán ẩn bên trong Evidence Engine.

## Related Documents

- [DECISION-026-Assessment-Core-Domain](DECISION-026-Assessment-Core-Domain.md)
- [Docs/05_Prompt_Architecture/PromptArchitecture_Draft.md](../05_Prompt_Architecture/PromptArchitecture_Draft.md)
- [Docs/04_AI_Architecture/AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md)
