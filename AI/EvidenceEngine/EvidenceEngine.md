# Evidence Engine — Spec

> Phát hiện kiến trúc mới trong Round 2, khi cụ thể hóa [DECISION-016-Evidence-Based-Decay](../../Docs/11_Decisions/DECISION-016-Evidence-Based-Decay.md). Founder/Lead Architect xác nhận Evidence Engine là một **Capability riêng**, không gộp vào Knowledge Engine hay Assessment Engine.
>
> **Cập nhật Round 4 ([DECISION-026](../../Docs/11_Decisions/DECISION-026-Assessment-Core-Domain.md)):** Assessment chính thức là Core Domain độc lập, **không phải Evidence Engine**. Mục "Output chính: Knowledge Regression" dưới đây đã lỗi thời ở phần "ai phát sinh Regression" — sửa lại: Evidence Engine chỉ cung cấp Evidence/EvidenceLink kèm `evidence_weight`; **Assessment Engine** là nơi quyết định Regression và cập nhật Mastery (xem [AssessmentDomain.md](../../Docs/03_Domain_Model/AssessmentDomain.md)).

## Vai trò

1. **Thu thập evidence** — từ MentorSession, Submission, DebugSession-equivalent (mọi tương tác có thể chứng minh hoặc bác bỏ hiểu biết).
2. **Phân loại evidence** — Positive hay Negative, và sub-capability/level nào của Mastery Framework mà nó liên quan tới.
3. **Liên kết evidence với Knowledge Graph** — gắn 1 Evidence vào 1 hoặc nhiều Knowledge Node (xem [EvidenceModel.md](EvidenceModel.md) — một evidence có thể chứng minh hiểu biết cho nhiều node cùng lúc, ví dụ 1 bài nộp project chứng minh cả "HTTP" và "Multipart Form").
4. **Tạo Positive Evidence** / **Tạo Negative Evidence** — xem [PositiveEvidence.md](PositiveEvidence.md), [NegativeEvidence.md](NegativeEvidence.md).
5. **Hỗ trợ Assessment Engine** — Assessment Engine quyết định *câu hỏi/bài tập gì để verify*; Evidence Engine quyết định *bằng chứng thu được sau đó nói lên điều gì*. Hai trách nhiệm tách biệt.

## Quan hệ với Engine khác

| Engine | Quan hệ |
|---|---|
| Knowledge Engine | Đọc Evidence/EvidenceLink khi cần (ví dụ hiển thị lịch sử) — **không cập nhật Mastery** (đổi Round 4, đó là việc của Assessment). |
| **Assessment Engine** *(ranh giới rõ lại, Round 4)* | Assessment Engine **nhận** Evidence/EvidenceLink (kèm `evidence_weight`) làm input, tự quyết định Knowledge Regression và cập nhật `KnowledgeNodeMastery`, sinh `AssessmentResult`. Evidence Engine không tự làm việc này. |
| Teaching Engine / Discovery Engine | Mọi tương tác giảng dạy/discovery có thể sinh ra Evidence — Evidence Engine là điểm thu thập chung, tránh mỗi Engine tự implement logic phân loại evidence riêng (trùng lặp). |

## Output chính (đổi Round 4)

Evidence Engine chỉ tạo `Evidence` + `EvidenceLink[]` (kèm `direction`, `evidence_weight`) — **không tự phát sinh Knowledge Regression** (khác Round 2/3). Knowledge Regression giờ là quyết định của Assessment Engine, dựa trên Evidence Weight do Evidence Engine cung cấp. Xem [AssessmentDomain.md](../../Docs/03_Domain_Model/AssessmentDomain.md).

## Minh bạch (Explainability First, DECISION-027)

Mọi Evidence/EvidenceLink phải giữ được `raw_reference` truy vết về tương tác gốc — đây là điều kiện để Assessment Engine sau đó có thể tạo `AssessmentResult` truy vết được, không phải Evidence Engine tự hiển thị lý do Regression (vì nó không quyết định Regression nữa).
