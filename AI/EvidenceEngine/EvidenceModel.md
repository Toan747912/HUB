# Evidence — Entity Spec

> Theo [DECISION-016](../../Docs/11_Decisions/DECISION-016-Evidence-Based-Decay.md), [DECISION-021](../../Docs/11_Decisions/DECISION-021-Evidence-Weighting.md), [DECISION-022](../../Docs/11_Decisions/DECISION-022-Evidence-KnowledgeNode-M2M.md) (Round 3), **[DECISION-026](../../Docs/11_Decisions/DECISION-026-Assessment-Core-Domain.md), [DECISION-027](../../Docs/11_Decisions/DECISION-027-Explainability-First.md) (Round 4)**.
>
> **Cập nhật Round 3:** `target_knowledge_nodes[]` (field đơn giản) bị loại bỏ, thay bằng `EvidenceLink[]` (mỗi link mang chiều support/refute + weight riêng cho từng KnowledgeNode).
>
> **Cập nhật Round 4 — ranh giới trách nhiệm đổi:** `Evidence` giờ thuộc **Evidence Domain** riêng (không còn gộp "Mastery & Evidence"). Evidence Domain **chỉ thu thập + phân loại** — **không tự quyết định Knowledge Regression và không tự cập nhật KnowledgeNodeMastery**. Việc đó thuộc về **Assessment Domain** (mới, [DECISION-026](../../Docs/11_Decisions/DECISION-026-Assessment-Core-Domain.md)), xem [AssessmentDomain.md](../../Docs/03_Domain_Model/AssessmentDomain.md). Evidence chỉ cung cấp `evidence_weight` làm input cho Assessment quyết định.

## `Evidence` (Aggregate Root)

| Thuộc tính | Ý nghĩa |
|---|---|
| `id` | Định danh |
| `source` | Nguồn sinh ra evidence: MentorSession, Submission, DebugSession-equivalent |
| `raw_reference` | Tham chiếu nội dung thô (câu trả lời, code, bài nộp) |
| `created_at` | Thời điểm ghi nhận |
| `links[]` | 1..n `EvidenceLink` — xem dưới |

🔶 OPEN *(mới, Round 3)* — Evidence còn cần field `type` (Positive/Negative) ở mức tổng quát không, hay khái niệm đó giờ chỉ tồn tại per-link? Tài liệu này tạm **bỏ field `type` cấp Evidence**, coi Positive/Negative là thuộc tính của từng `EvidenceLink` — cần Founder/ChatGPT xác nhận đây đúng là ý của DECISION-022.

## `EvidenceLink` (child entity của `Evidence`, không phải Aggregate riêng)

| Thuộc tính | Ý nghĩa |
|---|---|
| `knowledge_node_id` | KnowledgeNode mà link này nhắm tới |
| `direction` | `support` (Positive) \| `refute` (Negative) |
| `evidence_weight` | Trọng số của link này — quyết định mức ảnh hưởng tới Knowledge Regression (DECISION-021). Kiểu dữ liệu/công thức: 🔶 OPEN |
| `target_mastery_dimension` | Cấp độ/sub-capability bị ảnh hưởng: Remember / Explain(Level 2) / Apply / Teach.Explain / Teach.Simplify / Teach.Guide / Teach.Review / Teach.TransferKnowledge |

Ví dụ minh họa DECISION-022: 1 Evidence (bài nộp "Upload Video") có thể có 2 `EvidenceLink`:
```
Evidence #123 (source: Submission "Upload Video")
├── EvidenceLink → HTTP             | direction: support | weight: 0.8
└── EvidenceLink → Multipart Form   | direction: refute  | weight: 0.6
```

## Quan hệ

- 1 Evidence có 1..n `EvidenceLink`, mỗi link nhắm 1 KnowledgeNode — qua đó hiện thực hóa quan hệ many-to-many Evidence↔KnowledgeNode (DECISION-022).
- `EvidenceLink` là **child entity của `Evidence`** (cùng Aggregate, cùng transaction khi tạo) — không phải Aggregate riêng, vì nó không có vòng đời độc lập với Evidence cha.
- Evidence/EvidenceLink immutable — không sửa/xóa, chỉ thêm mới (giữ nguyên nguyên tắc Round 2).
- `KnowledgeNodeMastery` (Assessment Domain) tham chiếu **tới** EvidenceLink liên quan, không sở hữu — và không tự cập nhật trực tiếp, phải qua `AssessmentResult` (Explainability First, DECISION-027).

## Còn mở

- Kiểu dữ liệu/công thức `evidence_weight` — 🔶 OPEN (DECISION-021).
- Ai gán `evidence_weight`: AI tự đánh giá theo tình huống, hay bảng quy tắc cố định theo loại evidence? — 🔶 OPEN mới.
- Field `type` cấp Evidence (Positive/Negative tổng quát) còn cần không, hay đã hoàn toàn thay bằng `direction` per-link? — 🔶 OPEN mới, xem trên.
