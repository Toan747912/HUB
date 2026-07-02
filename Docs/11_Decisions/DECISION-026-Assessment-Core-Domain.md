# DECISION-026 — Assessment is an Independent Core Domain

- **Status:** Accepted (Locked) — resolves Open Question #17, restructures the Round 2/3 "Mastery & Evidence" merged domain
- **Date:** 2026-06-27 (Round 4)

## Context

Domain Architecture Review Report (Round 3) phát hiện Assessment Engine (capability "Understanding Verification", có từ Round 1) chưa được gán vào Core Domain nào trong CoreDomainMap. Claude đề xuất tạm gán vào "Mastery & Evidence" — Founder/Lead Architect quyết định khác: tách hẳn thành domain riêng.

## Decision

**Assessment là Core Domain độc lập** — không thuộc Evidence Domain, không thuộc Knowledge Domain.

Vai trò của Assessment Domain:
1. Nhận Evidence (từ Evidence Domain).
2. Đánh giá Evidence (quyết định ý nghĩa của evidence đó đối với mastery).
3. **Cập nhật Mastery** — Assessment Domain là write-owner của `KnowledgeNodeMastery`, không phải Evidence Domain.
4. Sinh **Assessment Result** — entity mới, ghi nhận chính thức kết quả đánh giá.

## Reasoning

Round 2/3 từng gộp "Evidence" và "Mastery" vào 1 domain ("Mastery & Evidence") vì cả hai cùng xoay quanh việc đo hiểu biết — nhưng điều này làm mờ một ranh giới quan trọng: **thu thập/phân loại bằng chứng** (việc của Evidence) khác với **diễn giải bằng chứng đó thành thay đổi trạng thái hiểu biết** (việc của Assessment). Tách riêng giúp: Evidence Domain có thể tái sử dụng cho nhiều mục đích khác ngoài cập nhật mastery (ví dụ hiển thị lịch sử cho Learner) mà không phụ thuộc logic đánh giá; Assessment Domain có một trách nhiệm rõ — là nơi duy nhất "ra quyết định" ảnh hưởng Mastery, dễ kiểm soát Explainability (DECISION-027) hơn vì mọi thay đổi Mastery đều đi qua một cửa duy nhất.

## Consequences

- Domain "Mastery & Evidence" (Round 2/3) được **tách thành 2 domain riêng**: **Evidence Domain** (chỉ còn sở hữu `Evidence`/`EvidenceLink`) và **Assessment Domain** (mới, sở hữu `AssessmentResult` **và** `KnowledgeNodeMastery`).
- **Quan trọng:** write-ownership của `KnowledgeNodeMastery` chuyển từ "Mastery & Evidence" (Round 2/3) sang **Assessment Domain**. Đây không phải sửa quyết định đã khóa — "Mastery & Evidence" chưa từng là tên domain do Founder chốt, chỉ là đề xuất DDD của Claude trong CoreDomainMap; giờ được tinh chỉnh theo chỉ đạo mới.
- Evidence Engine không còn tự quyết định/phát sinh Knowledge Regression trực tiếp ([DECISION-021](DECISION-021-Evidence-Weighting.md) áp dụng, nhưng việc *quyết định* trigger Regression giờ thuộc Assessment Engine, dựa trên Evidence Engine cung cấp Evidence Weight).
- Cần tài liệu domain riêng — [Docs/03_Domain_Model/AssessmentDomain.md](../03_Domain_Model/AssessmentDomain.md).
- [Docs/03_Domain_Model/CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md), [Docs/04_AI_Architecture/AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md) cập nhật theo cấu trúc domain mới.

## Related Documents

- [DECISION-009-Knowledge-Philosophy](DECISION-009-Knowledge-Philosophy.md)
- [DECISION-021-Evidence-Weighting](DECISION-021-Evidence-Weighting.md)
- [Docs/03_Domain_Model/AssessmentDomain.md](../03_Domain_Model/AssessmentDomain.md)
- [Docs/03_Domain_Model/CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md)
